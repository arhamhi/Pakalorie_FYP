"""Shared backend constants.

Kept tiny and dependency-free so both the user-facing food search
(`app.services.food_service`) and the RAG retrieval path
(`app.services.retrieval`) agree on what counts as a fuzzy match.
"""

# pg_trgm similarity floor for fuzzy name/alias matches. Both /foods/search
# and /calories retrieval use this same value so they never disagree on
# whether a query matches a dish. Substring (ILIKE) matches bypass it; the
# threshold only gates non-substring fuzzy hits (typos, transliteration).
TRIGRAM_SIMILARITY_THRESHOLD = 0.12
