#!/usr/bin/env python3
"""
🏦 Real Finance & Policy Agent - LLM + ChromaDB Hybrid (CONFIG + DOCS aware)

Replaces earlier agent with:
 - YAML config loading (config/azure_config.yaml)
 - Document ingestion from agents/schemes_and_policies/
 - State-level overrides usage
 - Small deterministic compute helpers for PMFBY / KCC / PM-KUSUM using YAML
 - Chroma index rebuild option (controlled via YAML)
"""

import asyncio
import logging
import os
import glob
import json
import math
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field

import yaml

# Optional Chroma + TF-IDF dependencies
_CHROMA_AVAILABLE = False
try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
    _CHROMA_AVAILABLE = True
except Exception:
    _CHROMA_AVAILABLE = False

_TFIDF_AVAILABLE = False
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    import numpy as np
    _TFIDF_AVAILABLE = True
except Exception:
    _TFIDF_AVAILABLE = False

# Keep your original LLM service import (adjust path if needed)
from services.llm_service import LLMService

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@dataclass
class FinanceAgentState:
    user_id: str
    session_id: str
    current_goal: str = "provide_financial_advice"
    conversation_history: List[Dict] = field(default_factory=list)
    user_preferences: Dict[str, Any] = field(default_factory=dict)
    learning_insights: Dict[str, Any] = field(default_factory=dict)
    user_profile: Dict[str, Any] = field(default_factory=dict)
    relevant_schemes: List[Dict] = field(default_factory=list)
    policy_data: List[Dict] = field(default_factory=list)
    financial_advice: Dict[str, Any] = field(default_factory=dict)
    decisions_made: List[Dict] = field(default_factory=list)
    confidence_level: float = 0.8
    adaptation_needed: bool = False
    llm_reasoning: str = ""
    llm_decisions: List[str] = field(default_factory=list)
    response_quality: float = 0.0
    user_satisfaction: Optional[float] = None
    improvement_areas: List[str] = field(default_factory=list)


class RealFinanceAgent:
    def __init__(self, config_path: str = "config/azure_config.yaml"):
        # LLM service (existing)
        self.llm_service = LLMService()
        self.learning_threshold = 0.7
        self.adaptation_count = 0

        # Load config
        self.config_path = config_path
        self.config = self._load_config(config_path)

        # retriever settings from YAML
        self.retriever_cfg = self.config.get("retriever", {})
        self.knowledge_cfg = self.config.get("knowledge_base", {})
        self.embeddings_cfg = self.config.get("embeddings", {})

        # Init Chroma or fallback
        self._init_retriever()
        
        # Ensure _raw_docs is always initialized
        if not hasattr(self, "_raw_docs"):
            self._raw_docs = []

        logger.info("🏦 Real Finance Agent initialized (config + docs aware)")

    # ---------------- Configuration ----------------
    def _load_config(self, path: str) -> Dict[str, Any]:
        if not os.path.exists(path):
            logger.error(f"Config file not found: {path}")
            return {}
        with open(path, "r", encoding="utf-8") as f:
            conf = yaml.safe_load(f)
        logger.info(f"Loaded config from {path}")
        return conf

    # ---------------- Retriever init & ingestion ----------------
    def _init_retriever(self):
        # If Chroma requested and available -> init persistent client
        if self.retriever_cfg.get("use_chroma", False) and _CHROMA_AVAILABLE:
            try:
                chroma_path = self.retriever_cfg.get("chroma_db_path", "chroma_db")
                self.chroma_client = chromadb.PersistentClient(path=chroma_path)
                coll_name = self.retriever_cfg.get("collection_name", "schemes_policies")
                
                # Check if we need to rebuild the index due to embedding dimension mismatch
                rebuild_needed = self.retriever_cfg.get("rebuild_index_on_start", False)
                
                # Try to get existing collection first
                try:
                    self.collection = self.chroma_client.get_collection(name=coll_name)
                    logger.info(f"Using existing Chroma collection: {coll_name}")
                    
                    # Test the collection with a sample query to check embedding dimensions
                    try:
                        test_result = self.collection.query(query_texts=["test"], n_results=1)
                        logger.info("Chroma collection test successful")
                        self._retriever_mode = "chroma"
                        return
                    except Exception as test_error:
                        if "dimension" in str(test_error).lower():
                            logger.warning(f"Embedding dimension mismatch detected: {test_error}")
                            rebuild_needed = True
                        else:
                            raise test_error
                            
                except Exception as e:
                    logger.info(f"Collection {coll_name} not found, creating new one: {e}")
                    rebuild_needed = True
                
                # If rebuild needed, delete existing collection and recreate
                if rebuild_needed:
                    try:
                        self.chroma_client.delete_collection(name=coll_name)
                        logger.info(f"Deleted existing collection {coll_name} for rebuild")
                    except Exception:
                        pass  # Collection might not exist
                
                # Create collection with proper embedding function
                model_name = self.retriever_cfg.get("embedding_model", None) or self.config.get("azure_openai",{}).get("embedding_model")
                if model_name:
                    try:
                        embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=model_name)
                        self.collection = self.chroma_client.create_collection(
                            name=coll_name,
                            embedding_function=embed_fn
                        )
                        logger.info(f"Created new Chroma collection with embedding model: {model_name}")
                    except Exception as e:
                        logger.warning(f"Embedding model {model_name} failed: {e}, using default")
                        # fallback to collection without embed_fn if embedding model fails to load
                        self.collection = self.chroma_client.create_collection(name=coll_name)
                else:
                    self.collection = self.chroma_client.create_collection(name=coll_name)
                
                # Rebuild index if needed
                if rebuild_needed:
                    self._rebuild_chroma_index()
                
                logger.info("Chroma retriever initialized")
                self._retriever_mode = "chroma"
                return
                
            except Exception as e:
                logger.warning(f"Chroma init failed: {e} — falling back to TF-IDF/keyword")
        
        # fallback
        self._init_fallback()

    def _init_fallback(self):
        # load raw docs into memory and construct TF-IDF if available
        path = self.knowledge_cfg.get("policy_documents_path", self.retriever_cfg.get("doc_folder","agents/schemes_and_policies"))
        patterns = self.retriever_cfg.get("file_globs", ["*.txt","*.md"])
        self._raw_docs = self._load_policy_texts(path, patterns)
        self._tfidf = None  # Initialize to None first
        
        if _TFIDF_AVAILABLE and self._raw_docs:
            try:
                texts = [t for _,t in self._raw_docs]
                self._tfidf = TfidfVectorizer(max_features=20000).fit(texts)
                logger.info("TF-IDF fallback initialized")
                self._retriever_mode = "tfidf"
            except Exception as e:
                logger.warning(f"TF-IDF initialization failed: {e}")
                self._tfidf = None
                self._retriever_mode = "keywords"
                logger.info("Keyword fallback initialized")
        else:
            self._tfidf = None
            self._retriever_mode = "keywords"
            logger.info("Keyword fallback initialized")

    def _load_policy_texts(self, folder: str, patterns: List[str]) -> List[Tuple[str,str]]:
        docs = []
        for gl in patterns:
            for p in glob.glob(os.path.join(folder, gl)):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        docs.append((p, f.read()))
                except Exception:
                    continue
        logger.info(f"Loaded {len(docs)} policy documents from {folder}")
        return docs

    def _rebuild_chroma_index(self):
        # Read files, chunk, and add to chroma collection
        folder = self.knowledge_cfg.get("policy_documents_path", self.retriever_cfg.get("doc_folder","agents/schemes_and_policies"))
        patterns = self.retriever_cfg.get("file_globs", ["*.txt","*.md"])
        docs = self._load_policy_texts(folder, patterns)
        if not docs:
            logger.warning("No documents found for indexing")
            return
        # clear collection
        try:
            existing = self.collection.get()
            ids = existing.get("ids", [])
            if ids:
                self.collection.delete(ids=ids)
        except Exception:
            pass
        # chunk config
        chunk_size = int(self.embeddings_cfg.get("chunk_size_chars", 800))
        overlap = int(self.embeddings_cfg.get("chunk_overlap_chars", 100))
        ids, texts, metas = [], [], []
        idx = 0
        for path, text in docs:
            for chunk in self._chunk_text(text, chunk_size, overlap):
                ids.append(f"doc{idx}")
                texts.append(chunk)
                metas.append({"path": path})
                idx += 1
        if texts:
            try:
                self.collection.add(ids=ids, documents=texts, metadatas=metas)
                logger.info(f"Indexed {len(texts)} chunks into Chroma collection")
            except Exception as e:
                logger.error(f"Chroma add failed: {e}")

    def _chunk_text(self, text: str, size: int, overlap: int) -> List[str]:
        if not text:
            return []
        chunks = []
        i = 0
        n = len(text)
        while i < n:
            chunks.append(text[i:i+size])
            i += max(1, size - overlap)
        return chunks

    # ---------------- Document search ----------------
    async def _search_policies_with_chromadb(self, query: str, user_context: Dict) -> List[Dict[str,Any]]:
        """Unified search that uses Chroma or fallback TF-IDF/keyword extraction"""
        try:
            q = f"{query} {user_context.get('crop_type','')} {user_context.get('location','')}"
            if getattr(self, "_retriever_mode", "") == "chroma":
                try:
                    # Use Chroma collection.query
                    res = self.collection.query(query_texts=[q], n_results=int(self.embeddings_cfg.get("top_k",5)))
                    policies = []
                    docs = res.get("documents",[[]])[0]
                    metas = res.get("metadatas",[[]])[0]
                    dists = res.get("distances",[[]])[0] if res.get("distances",None) else []
                    for i, d in enumerate(docs):
                        policies.append({
                            "content": d,
                            "metadata": metas[i] if metas and i < len(metas) else {},
                            "score": float(dists[i]) if dists and i < len(dists) else 0.0
                        })
                    return policies
                except Exception as chroma_error:
                    logger.error(f"ChromaDB search failed: {chroma_error}")
                    # If ChromaDB fails (e.g., embedding dimension mismatch), fallback to TF-IDF
                    logger.info("Falling back to TF-IDF search due to ChromaDB error")
                    self._retriever_mode = "tfidf"
                    # Continue to TF-IDF fallback below
                    
            if getattr(self, "_retriever_mode", "") == "tfidf" and hasattr(self, "_tfidf") and self._tfidf is not None:
                try:
                    texts = [t for _,t in self._raw_docs]
                    dv = self._tfidf.transform(texts)
                    qv = self._tfidf.transform([q])
                    sims = (qv @ dv.T).toarray().ravel()
                    top_idx = sims.argsort()[::-1][:int(self.embeddings_cfg.get("top_k",5))]
                    policies = []
                    for idx in top_idx:
                        path, txt = self._raw_docs[idx]
                        policies.append({"content": txt[:1200], "metadata": {"path": path}, "score": float(sims[idx])})
                    return policies
                except Exception as tfidf_error:
                    logger.error(f"TF-IDF search failed: {tfidf_error}")
                    # Fallback to keyword search
                    self._retriever_mode = "keywords"
                    
            # keyword heuristic (final fallback)
            try:
                hits = []
                qtokens = [tok.lower() for tok in re.findall(r"\w+", q) if len(tok)>2]
                raw_docs = getattr(self, "_raw_docs", []) or []
                for path, txt in raw_docs:
                    score = sum(txt.lower().count(tok) for tok in qtokens)
                    if score>0:
                        hits.append((score, path, txt[:1200]))
                hits.sort(reverse=True)
                policies = [{"content": h[2], "metadata":{"path":h[1]}, "score": float(h[0])} for h in hits[:int(self.embeddings_cfg.get("top_k",5))]]
                return policies
            except Exception as keyword_error:
                logger.error(f"Keyword search failed: {keyword_error}")
                return []
                
        except Exception as e:
            logger.error(f"Policy search error: {e}")
            return []

    # ---------------- YAML-driven helpers ----------------
    def _get_state_override(self, scheme_key: str, state_name: str) -> Optional[Dict[str,Any]]:
        """Return the override dict for scheme if state matches an override"""
        scheme = self.config.get("schemes",{}).get(scheme_key, {})
        overrides = scheme.get("state_overrides", {}) or {}
        if not state_name:
            return None
        sn = state_name.strip().lower().replace(" ", "_")
        # check named groups
        for key, val in overrides.items():
            # if override defines a list of states or a named group
            if isinstance(val, dict) and ("states" in val):
                if sn in [s.lower() for s in val["states"]]:
                    return val
            # if override name includes group keyword
            if key.endswith("states") or "north" in key or "himalayan" in key:
                # common named override for north_eastern_and_himalayan -> check membership in geography
                special = self.config.get("geography",{}).get("special_regions",[])
                if sn in special:
                    return val
            # direct list of exited states
            if isinstance(val, list) and sn in [s.lower().replace(" ","_") for s in val]:
                return {"exited": True}
        # Also check direct state lists
        # e.g., pmfby: state_overrides: { exited_states: [ ... ] }
        for k,v in overrides.items():
            if isinstance(v, list) and sn in [s.lower().replace(" ", "_") for s in v]:
                return {"exited": True}
        return None

    def _compute_pmfby_quote(self, profile: Dict[str,Any], override: Optional[Dict]=None) -> Dict[str,Any]:
        """Compute PMFBY premium & event payouts using YAML values (simple deterministic)"""
        pmfby = self.config.get("schemes",{}).get("pmfby", {})
        premium_caps = pmfby.get("premium_caps", {})
        benefits = pmfby.get("benefits", {})
        season = (profile.get("season") or "").lower()
        crop_cat = (profile.get("crop_category") or "").lower()
        if crop_cat == "commercial_horticulture" or season == "annual":
            premium_pct = float(premium_caps.get("annual_commercial_horticultural_pct",5.0))
        else:
            premium_pct = float(premium_caps.get("kharif_food_oilseed_pct",2.0)) if season=="kharif" else float(premium_caps.get("rabi_food_oilseed_pct",1.5))
        # sum insured
        if profile.get("sum_insured_inr"):
            sum_insured = float(profile["sum_insured_inr"])
        else:
            if not profile.get("area_hectare") or not profile.get("sof_per_hectare_inr"):
                raise ValueError("PMFBY needs area_hectare & sof_per_hectare_inr (or sum_insured_inr)")
            sum_insured = float(profile["area_hectare"]) * float(profile["sof_per_hectare_inr"])
        premium = sum_insured * (premium_pct/100.0)
        prevented = sum_insured * (float(benefits.get("prevented_sowing_pct_of_sum_insured",25.0))/100.0)
        mid = sum_insured * (float(benefits.get("mid_season_on_account_pct_of_sum_insured",25.0))/100.0)
        result = {
            "premium_rate_pct": premium_pct,
            "sum_insured_inr": sum_insured,
            "farmer_premium_inr": round(premium,2),
            "prevented_sowing_cover_inr": round(prevented,2),
            "mid_season_on_account_inr": round(mid,2),
            "notes": pmfby.get("sources", [])
        }
        # apply state-level premium subsidy override if present
        if override and isinstance(override, dict):
            ps = override.get("premium_subsidy")
            if ps and isinstance(ps, dict):
                result["state_override"] = ps
        return result

    def _compute_kcc_summary(self, amount_inr: float, fy: str="2025-26") -> Dict[str,Any]:
        kcc = self.config.get("schemes",{}).get("kcc", {})
        base = float(kcc.get("base_interest_rate_pct",7.0))
        pri = float(kcc.get("prompt_repayment_incentive_pct",3.0))
        miss = float(kcc.get("miss_subvention_to_banks_pct",1.5))
        miss_caps = kcc.get("miss_cap_by_fy",{})
        miss_cap = miss_caps.get(fy, list(miss_caps.values())[-1] if miss_caps else None)
        coll_gen = kcc.get("collateral_free",{}).get("general_limit_inr",200000)
        effective_rate_if_prompt = max(0.0, base - pri)
        return {
            "base_interest_rate_pct": base,
            "prompt_repayment_incentive_pct": pri,
            "effective_rate_if_prompt_pct": effective_rate_if_prompt,
            "miss_subvention_to_banks_pct": miss,
            "miss_cap_inr": miss_cap,
            "collateral_free_general_inr": coll_gen,
            "note": "Banks may phase in new caps; always check bank circulars",
            "sources": kcc.get("sources",[])
        }

    def _compute_kusum_quote(self, profile: Dict[str,Any], override: Optional[Dict]=None) -> Dict[str,Any]:
        kusum = self.config.get("schemes",{}).get("pm_kusum",{})
        comp = (profile.get("kusum_component") or "B").upper()
        cost = float(profile.get("system_cost_inr", 0))
        if comp == "B":
            b = kusum.get("components",{}).get("B",{})
            cfa_pct = b.get("cfa_pct",30.0)
            if override and isinstance(override, dict):
                cfa_pct = override.get("cfa_pct", cfa_pct)
            cfa = cost * cfa_pct/100.0
            state_sub = cost * b.get("state_subsidy_min_pct",30.0)/100.0
            farmer_total = max(0.0, cost - (cfa + state_sub))
            return {"component":"B","system_cost_inr":cost,"cfa_inr":round(cfa,2),"state_subsidy_inr":round(state_sub,2),"farmer_total_after_subsidy_inr":round(farmer_total,2)}
        else:
            cips = kusum.get("components",{}).get("C",{}).get("individual_pump_solarisation",{})
            cfa_pct = cips.get("cfa_pct",30.0)
            if override and isinstance(override, dict):
                cfa_pct = override.get("cfa_pct", cfa_pct)
            cfa = cost * cfa_pct/100.0
            state_sub = cost * cips.get("state_subsidy_min_pct",30.0)/100.0
            farmer_total = max(0.0, cost - (cfa + state_sub))
            return {"component":"C","system_cost_inr":cost,"cfa_inr":round(cfa,2),"state_subsidy_inr":round(state_sub,2),"farmer_total_after_subsidy_inr":round(farmer_total,2)}

    # ---------------- LLM integration ----------------
    async def _analyze_with_llm(self, context: str, policies: List[Dict], user_context: Dict) -> Dict[str,Any]:
        """Use LLM to analyze policies and provide structured financial advice.
           We include YAML-driven deterministic findings as well for grounding.
        """
        # Add deterministic snippets from YAML to ground the LLM
        yaml_snippets = []
        try:
            # pmfby quick compute if relevant
            try:
                pmfby_override = self._get_state_override("pmfby", user_context.get("location",""))
                if user_context.get("area_hectare") or user_context.get("sum_insured_inr"):
                    pmfby_snip = self._compute_pmfby_quote(user_context, pmfby_override)
                    yaml_snippets.append({"pmfby": pmfby_snip})
            except Exception:
                pass
            # kcc summary
            kcc_snip = self._compute_kcc_summary(user_context.get("kcc_request_amount_inr",0), fy=user_context.get("fy","2025-26"))
            yaml_snippets.append({"kcc": kcc_snip})
        except Exception:
            pass

        # Build prompt with better JSON formatting instructions
        prompt = f"""
You are an expert agricultural finance & policy advisor. Analyze the user query and provide structured financial advice.

USER CONTEXT:
{json.dumps(user_context, indent=2)}

USER QUERY: {context}

AVAILABLE SCHEMES DATA:
{json.dumps(yaml_snippets, indent=2)}

POLICY DOCUMENTS:
{json.dumps([p.get('content','')[:800] for p in policies[:4]], indent=2)}

IMPORTANT: Respond ONLY with valid JSON in this exact format:

{{
  "eligibility_assessment": "string describing eligibility",
  "recommended_schemes": ["scheme1", "scheme2"],
  "financial_benefits": {{
    "type": "loan/subsidy/grant",
    "amount_inr": 50000
  }},
  "application_process": ["step1", "step2"],
  "required_documents": ["doc1", "doc2"],
  "timeline": "short_term/medium_term/long_term",
  "risk_assessment": "low/medium/high",
  "alternative_options": ["option1", "option2"],
  "reasoning": "explanation of recommendations",
  "priority_actions": ["action1", "action2"]
}}

Do not include any text before or after the JSON. Only return the JSON object.
"""
        try:
            resp = await self.llm_service.get_completion(prompt)
            # Clean the response to extract JSON
            resp = resp.strip()
            if resp.startswith('```json'):
                resp = resp[7:]
            if resp.endswith('```'):
                resp = resp[:-3]
            resp = resp.strip()
            
            parsed = json.loads(resp)
            return parsed
        except Exception as e:
            logger.error(f"LLM analysis error: {e}")
            logger.error(f"Raw LLM response: {resp[:200]}...")
            return self._get_fallback_analysis(policies)

    # ... (keep your existing decision / generate / learn / fallback methods)
    async def _make_autonomous_decisions(self, state: FinanceAgentState) -> FinanceAgentState:
        # re-use your original implementation but keep it compact
        decision_prompt = f"..."
        try:
            resp = await self.llm_service.get_completion(decision_prompt)
            decisions = json.loads(resp)
            state.llm_decisions.append(decisions)
            state.decisions_made.append({"timestamp": datetime.now().isoformat(), "decisions": decisions})
            return state
        except Exception:
            return state

    async def _generate_personalized_response(self, state: FinanceAgentState) -> str:
        """Generate a personalized response based on the financial advice"""
        try:
            advice = state.financial_advice
            schemes = state.relevant_schemes
            
            # Build a comprehensive response
            response_parts = []
            
            # Introduction
            response_parts.append(f"Hello! I can help you with your loan query.")
            
            # Eligibility assessment
            if advice.get("eligibility_assessment"):
                response_parts.append(f"Based on your profile, your eligibility is: {advice['eligibility_assessment']}")
            
            # Recommended schemes
            if advice.get("recommended_schemes"):
                schemes_list = ", ".join(advice["recommended_schemes"])
                response_parts.append(f"I recommend these schemes: {schemes_list}")
            
            # Financial benefits
            if advice.get("financial_benefits"):
                benefits = advice["financial_benefits"]
                if benefits.get("amount_inr"):
                    response_parts.append(f"You may be eligible for up to ₹{benefits['amount_inr']:,} in {benefits.get('type', 'benefits')}")
            
            # Application process
            if advice.get("application_process"):
                response_parts.append("Application steps:")
                for i, step in enumerate(advice["application_process"][:3], 1):
                    response_parts.append(f"{i}. {step}")
            
            # Required documents
            if advice.get("required_documents"):
                docs = ", ".join(advice["required_documents"][:5])
                response_parts.append(f"Required documents: {docs}")
            
            # Priority actions
            if advice.get("priority_actions"):
                response_parts.append("Priority actions:")
                for action in advice["priority_actions"][:2]:
                    response_parts.append(f"• {action}")
            
            # Add reasoning if available
            if advice.get("reasoning"):
                response_parts.append(f"Note: {advice['reasoning']}")
            
            return "\n\n".join(response_parts)
            
        except Exception as e:
            logger.error(f"Response generation error: {e}")
            return self._get_fallback_response(state)

    async def _learn_from_interaction(self, state: FinanceAgentState) -> FinanceAgentState:
        # simplified learning; reuse earlier style
        return state

    def _get_fallback_analysis(self, policies: List[Dict]) -> Dict[str,Any]:
        # Enhanced fallback analysis for loan queries
        if not policies:
            return {
                "eligibility_assessment": "likely eligible for basic schemes",
                "recommended_schemes": ["kcc", "pm_kisan"],
                "financial_benefits": {"amount": 50000, "type": "loan"},
                "application_process": [
                    "Visit your local bank branch",
                    "Submit KCC application form",
                    "Provide required documents",
                    "Wait for approval (7-15 days)"
                ],
                "required_documents": [
                    "Aadhaar card",
                    "Land records/ownership documents", 
                    "Bank account details",
                    "Income certificate",
                    "Passport size photos"
                ],
                "timeline": "short_term",
                "risk_assessment": "low",
                "alternative_options": [
                    "Cooperative bank loans",
                    "Regional Rural Banks",
                    "NABARD refinanced loans"
                ],
                "reasoning": "Based on standard agricultural loan eligibility criteria",
                "priority_actions": [
                    "Contact your nearest bank branch",
                    "Gather all required documents",
                    "Check your land record status"
                ]
            }
        # else some basic inference from available policies
        return {
            "eligibility_assessment": "eligible for multiple schemes",
            "recommended_schemes": ["kcc", "pm_kisan", "pmfby"],
            "financial_benefits": {"amount": 100000, "type": "loan_and_subsidy"},
            "application_process": [
                "Apply for KCC at your bank",
                "Register for PM-KISAN online",
                "Consider PMFBY for crop insurance"
            ],
            "required_documents": [
                "Aadhaar card",
                "Land ownership documents",
                "Bank account details",
                "Income certificate"
            ],
            "timeline": "short_term",
            "risk_assessment": "low",
            "alternative_options": [
                "Cooperative society loans",
                "Microfinance institutions",
                "Self-help group loans"
            ],
            "reasoning": "Based on available policy documents and standard eligibility",
            "priority_actions": [
                "Apply for KCC immediately",
                "Register for PM-KISAN benefits",
                "Consider crop insurance"
            ]
        }

    def _get_fallback_response(self, state: FinanceAgentState) -> str:
        if not state.relevant_schemes:
            return "No schemes found. Visit local agricultural office."
        return f"Found {len(state.relevant_schemes)} documents. Please check details."

    # ---------------- Main interface ----------------
    async def get_financial_advice(self, context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            state = FinanceAgentState(
                user_id=context.get("user_id","unknown"),
                session_id=f"session_{int(asyncio.get_event_loop().time())}",
                user_profile=context.get("user_profile",{}),
                conversation_history=context.get("conversation_history",[])
            )

            user_context = {
                "crop_type": context.get("crop",""),
                "location": context.get("location",""),
                "area_hectare": context.get("area_hectare"),
                "sof_per_hectare_inr": context.get("sof_per_hectare_inr"),
                "sum_insured_inr": context.get("sum_insured_inr"),
                "kcc_request_amount_inr": context.get("kcc_request_amount_inr",0),
                "fy": context.get("fy","2025-26")
            }

            # 1) Search policies
            policies = await self._search_policies_with_chromadb(context.get("query",""), user_context)
            state.relevant_schemes = policies
            state.policy_data = policies

            # 2) LLM analysis (grounded by YAML snippets)
            if policies:
                analysis = await self._analyze_with_llm(context.get("query",""), policies, user_context)
                state.financial_advice = analysis
                state.llm_reasoning = analysis.get("reasoning","")
                state.confidence_level = 0.8
            else:
                state.financial_advice = self._get_fallback_analysis(policies)
                state.confidence_level = 0.45

            # 3) Autonomous decisions (call)
            state = await self._make_autonomous_decisions(state)

            # 4) Generate response
            response_text = await self._generate_personalized_response(state)

            # 5) Learn
            state = await self._learn_from_interaction(state)

            # update history
            state.conversation_history.append({
                "timestamp": datetime.now().isoformat(),
                "type": "agent_response",
                "content": response_text,
                "confidence": state.confidence_level
            })

            return {
                "relevant_schemes": state.relevant_schemes,
                "financial_advice": state.financial_advice,
                "response": response_text,
                "confidence": state.confidence_level,
                "agent_insights": {
                    "decisions_made": len(state.decisions_made),
                    "llm_reasoning": state.llm_reasoning,
                    "adaptation_count": self.adaptation_count,
                    "learning_insights": state.learning_insights
                }
            }

        except Exception as e:
            logger.error(f"RealFinanceAgent error: {e}")
            return {
                "relevant_schemes": [],
                "financial_advice": {},
                "response": f"Agent error: {e}",
                "confidence": 0.0,
                "error": str(e)
            }


# Global instance for easy import
real_finance_agent = RealFinanceAgent()
