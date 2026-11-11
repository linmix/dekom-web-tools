# Creating a Language Dictionary for a New DEKOM Site

This guide describes how the Dutch and German dictionaries were originally built, what is worth reusing, and a safer repeatable process for creating a Spanish dictionary. It is deliberately separate from the scan workflow: first build and validate the language dictionary; then add it to a site audit.

## Goal

Build a high-precision Spanish dictionary from the Spanish DEKOM site. The dictionary will later help flag Spanish text when it appears on a site where Spanish is not expected. Precision matters more than coverage: a missed Spanish word can be added later, while a common false positive makes every report less useful.

## What the existing Dutch and German folders teach us

The original process was:

1. Crawl the complete Dutch or German DEKOM site.
2. Extract page text.
3. Count each word by frequency.
4. Remove brand names, technical noise, and words shared with the language being checked.
5. Review the remaining words and make a starting dictionary.
6. Classify reviewed words as exact words, stems, suffixes, or connectors.
7. Run a real audit, inspect false positives, and refine the dictionaries.

Useful code patterns to retain:

| Purpose                                       | Existing files                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Count words                                   | `dutch-source/buildWordList.js`, `german-source/buildWordList.js`                       |
| Exclude noise and ambiguous terms             | `dutch-source/filterWords.js`, `german-source/filterWords.js`, plus `remove-words.json` |
| Create a practical review set                 | `dutch-source/createReviewList.js`, `german-source/createReviewList.js`                 |
| Compare candidates with existing dictionaries | `dutch-source/compareDictionary.js`, `german-source/compareGermanWords.js`              |
| Prioritise review by frequency                | `german-source/splitMissingWords.js`                                                    |
| Merge reviewed Dutch classifications          | `dutch-source/updateDutchDictionaries.js`                                               |

Do **not** reuse `dutch-source/index.js` or `german-source/index.js`. They belong to the retired scraper design and no longer work with the current language-specific cache layout. Do not use `german-source/compareDictionary.js`; it is unfinished.

## Recommended Spanish folder and files

Create a `spanish-source/` folder using the same data-only layout:

```text
spanish-source/
  buildWordList.js
  filterWords.js
  createReviewList.js
  compareDictionary.js
  splitMissingWords.js
  updateSpanishDictionaries.js
  remove-words.json
  words.json
  words-filtered.json
  review-words.json
  missing-spanish-words.json
  missing-high.json
  missing-medium.json
  missing-low.json
  missing-high-separated.json
```

Create these dictionaries alongside the current Dutch and German ones:

```text
dictionaries/es_core_vocab.json
dictionaries/es_connectors.json       # optional; see below
dictionaries/es_prefixes.json
dictionaries/es_suffixes.json
```

Use a Spanish language cache such as `cache/es/`. The modern downloader and extractor take a language/cache identifier, so the Spanish source crawl should store its files there. The word-list script should read only `cache/es/text/*-visible.txt`; do not count JSON hidden-content files as normal page prose.

## Repeatable process

### 1. Collect a representative Spanish corpus

Crawl the Spanish DEKOM sitemap, use the same include/exclude filtering approach as the current indexes, download the selected pages, and extract text into `cache/es/text/`. Keep the URL map and a dated URL snapshot.

Before continuing, check that the text files are populated and that the sample includes product pages, news, contact pages, and long-form content. A dictionary built only from navigation and cookie text will be poor.

### 2. Build the frequency list

Run `buildWordList.js` against the visible Spanish text. It should write `words.json` as:

```json
[{ "word": "ejemplo", "count": 123 }]
```

Normalize consistently: lowercase words, Unicode letters only, and no punctuation. Preserve counts; they are the best review priority.

### 3. Filter obvious non-Spanish and high-risk terms

Maintain `remove-words.json` in this shape:

```json
{
  "brand_names": [],
  "english_words": [],
  "dutch_words": [],
  "german_words": [],
  "international_words": [],
  "technical_noise": []
}
```

Only add words to a removal list when they are too ambiguous to be useful evidence of Spanish. Do not remove a word merely because it is also valid in another language; that decision depends on the target site being audited. Keep the original `words.json` untouched and write the filtered result to `words-filtered.json`.

### 4. Make a review list and classify it

Start by reviewing words with a count of at least 5, then split missing candidates into high, medium, and low frequency groups. Review high-frequency terms first.

For every reviewed word, choose one of:

- `exact_words`: a Spanish word or fixed form that is strong evidence of Spanish.
- `stems`: a short base only when it safely matches many Spanish forms and is unlikely to match another language accidentally.
- `suffixes`: use sparingly; suffix matching is broad and can create false positives.
- `connectors`: short Spanish function words, if you want them separately visible during review.
- `ignore`: brand names, product names, shared international terms, proper nouns, URLs, codes, and ambiguous items.

Separating connectors is mostly a review/maintenance choice. They can also be stored in the core exact-word list; the important thing is that they are not duplicated and that the scanner reads the chosen location.

### 5. Create only a small seed dictionary, if any

An LLM-generated starter dictionary is optional. The DEKOM corpus should be the primary source of truth. If a seed is used, keep it small and high confidence, mark its provenance, and validate it against real pages before expanding it.

### 6. Merge classifications and test in a real audit

`updateSpanishDictionaries.js` should be the single script that reads the reviewed classification JSON and merges unique values into the `es_*` dictionaries. Do not use a one-off script that blindly adds every unclassified word as an exact match.

Run the Spanish detector on a real target site, inspect the visible and hidden reports, and feed false positives back into `remove-words.json` or the `ignore` list. Feed genuine misses back into the reviewed classification file. Keep the current reports focused on actionable findings.

## LLM prompts

Give the model structured data and ask it to return JSON only. Start with small batches (for example 100–300 words); do not send a whole frequency list at once.

### Prompt A — filter candidates before human review

```text
You are preparing a high-precision Spanish-language detection dictionary for a website audit.

For each candidate token below, decide whether it should be removed before it becomes evidence of Spanish. We will use the dictionary to detect unexpected Spanish text on other localized websites, so false positives are costly.

Remove only tokens that are clearly one or more of:
- a DEKOM/product/company brand name;
- a person, place, URL fragment, file extension, identifier, or code;
- technical noise or a token that is not ordinary natural-language text;
- an international/shared word that is weak evidence of Spanish;
- a word that is also common in [TARGET LANGUAGE(S)] and would therefore be ambiguous.

Keep ordinary Spanish words, including inflected forms, unless they are genuinely ambiguous.

Return valid JSON only:
{
  "keep": [{"word":"...","count":0,"reason":"brief"}],
  "remove": [{"word":"...","count":0,"categories":["brand_names|english_words|dutch_words|german_words|international_words|technical_noise"],"reason":"brief"}],
  "uncertain": [{"word":"...","count":0,"reason":"brief"}]
}

Do not invent words or change counts.

CANDIDATES:
<PASTE JSON ARRAY OF {word, count}>
```

Replace `[TARGET LANGUAGE(S)]` with the site language(s) on which Spanish will be considered an error—for example Dutch and English.

### Prompt B — classify reviewed Spanish words

```text
You are curating a high-precision Spanish detection dictionary for website-language QA.

Classify each candidate into exactly one of: exact_words, stems, suffixes, connectors, ignore.

Rules:
- Prefer exact_words for ordinary Spanish words and fixed forms.
- Use stems only when the stem is sufficiently specific to Spanish and safely covers useful variants.
- Use suffixes only when the suffix is unusually reliable; otherwise use exact_words or ignore.
- Use connectors only for short Spanish function words if keeping them separately is useful for review. They may instead be exact_words; choose one category only.
- Use ignore for brands, proper nouns, technical tokens, shared international words, and words ambiguous with Dutch, English, or German.
- High frequency does not prove that a token is Spanish.

Return valid JSON only:
{
  "exact_words": [],
  "stems": [],
  "suffixes": [],
  "connectors": [],
  "ignore": [{"word":"...","reason":"brief"}]
}

Each input word must appear exactly once. Do not add words not present in the input.

WORDS:
<PASTE JSON ARRAY OF {word, count}>
```

### Prompt C — optional small starting seed

```text
Create a conservative starter set for a Spanish-language detection dictionary used in website QA. It will be combined with a DEKOM Spanish-site corpus, not used as a complete Spanish dictionary.

Provide only high-confidence, ordinary Spanish words that are unlikely to be common English, Dutch, or German words. Avoid names, brands, product terms, URLs, accents-only variants, very short tokens, and broad suffixes.

Return valid JSON only:
{
  "exact_words": [],
  "stems": [],
  "suffixes": [],
  "connectors": []
}

Keep the result deliberately small: at most 150 exact words, 20 stems, 10 suffixes, and 30 connectors. Include no explanation outside the JSON.
```

### Prompt D — false-positive review after a live scan

```text
You are reviewing suspected Spanish-language matches from a website where Spanish is not expected.

For each finding, decide whether it is:
- true_spanish: clear Spanish text that should remain detectable;
- false_positive: should not be reported, with the reason;
- uncertain: needs human review.

For a false positive, recommend exactly one corrective action: remove from exact dictionary, move to ignore, narrow a stem/suffix, retain but require a second nearby Spanish match, or leave unchanged.

Return valid JSON only:
[{"url":"...","match":"...","decision":"true_spanish|false_positive|uncertain","reason":"brief","action":"..."}]

FINDINGS:
<PASTE REPORT FINDINGS>
```

## Definition of done

The Spanish dictionary is ready when:

- it can be rebuilt from a documented Spanish corpus;
- every automated dictionary update comes from a reviewed classification file;
- a test scan finds genuine Spanish content without a distracting volume of false positives;
- the remaining false positives and missed words have a documented feedback path; and
- the source data, dictionary version, URL snapshot, and resulting audit reports are retained for comparison.
