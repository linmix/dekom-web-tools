const fs = require("fs");
const path = require("path");
const { formatCurrentSeoMetadata } = require("./formatSeoMetadata");


/*
 * ================================================================
 * DEKOM SEO BATCH BUILDER
 * ================================================================
 *
 * Reads:
 *
 *   SEO/<site>/index.json
 *   SEO/<site>/pages/*.json
 *   SEO/<site>/markdown/*.md
 *
 * Writes disposable derived output:
 *
 *   SEO/<site>/batches/
 *       manifest.json
 *       batch-summary.json
 *       batch-tree.md
 *
 *       01-[TODO]-platform-zoom.json
 *       01-[TODO]-platform-zoom.md
 *       ...
 *
 *       _unclassified.json
 *       _unclassified.md
 *
 * Goals:
 *
 * - derive batch membership from the current site structure;
 * - avoid manually maintaining lists of individual pages;
 * - automatically include new pages beneath known branches;
 * - keep major logical SEO families together;
 * - associate selected major partner pages with their platform family;
 * - keep the bulk "all partners" section until the end;
 * - keep bulk partner batches small enough for practical review;
 * - never silently discard pages that cannot be classified;
 * - provide lightweight QC files for inspecting grouping.
 *
 * IMPORTANT:
 *
 * Batch IDs are stable machine identities.
 *
 * Display numbers and [TODO] filenames are derived presentation.
 * Later review-state tooling will provide persistent review status.
 *
 * ================================================================
 */


/*
 * ------------------------------------------------
 * Stable major platform ordering
 * ------------------------------------------------
 *
 * Unknown/new platform families are still accepted automatically.
 * They simply sort after the explicitly prioritised platforms.
 */

const PLATFORM_PRIORITY = {
    zoom: 10,
    "microsoft-teams": 20,
    "cisco-webex": 30,
    "google-meet": 40,
    ringcentral: 50,
    pexip: 60
};


/*
 * ------------------------------------------------
 * Cross-branch associations
 * ------------------------------------------------
 *
 * These are semantic relationships the URL hierarchy cannot express.
 *
 * Example:
 *
 *   /oplossingen/platform/zoom
 *
 * and
 *
 *   /producten-partners/onze-partners/zoom
 *
 * should be reviewed together.
 *
 * IMPORTANT:
 *
 * Featured partners are associated with platform batches here.
 * Bulk all-partners entries remain in the later review phase unless
 * they are explicitly listed in BULK_PARTNER_PLATFORM below.
 */

const MAJOR_PARTNER_PLATFORM = {
    zoom: "zoom",
    microsoft: "microsoft-teams",
    cisco: "cisco-webex"
};


/*
 * ------------------------------------------------
 * Smaller top-tier featured partner families
 * ------------------------------------------------
 *
 * Review these vendors together to preserve useful comparison
 * context without creating one-page or two-page batches.
 */

const GROUPED_FEATURED_PARTNERS = new Set([
    "hp-poly",
    "q-sys",
    "shure",
    "yealink"
]);


/*
 * ------------------------------------------------
 * Explicit bulk-partner platform associations
 * ------------------------------------------------
 *
 * Most entries under /all-partners/ stay in the later bulk review.
 * Add an exception when the vendor has a corresponding platform
 * family and the pages should be reviewed together.
 */

const BULK_PARTNER_PLATFORM = {
    google: "google-meet",
    ringcentral: "ringcentral",
    pexip: "pexip"
};


/*
 * ------------------------------------------------
 * Path aliases
 * ------------------------------------------------
 *
 * The four DEKOM sites contain Dutch and English URL structures.
 *
 * Keep aliases here only for structural concepts.
 * Individual pages must never be enumerated here.
 */

const ALIASES = {

    solutions: [
        "oplossingen",
        "solutions"
    ],

    method: [
        "methode",
        "method",
        "methods"
    ],

    workspace: [
        "werkplek",
        "workspace",
        "workspaces"
    ],

    productsPartners: [
        "producten-partners",
        "products-partners"
    ],

    mediaTechnology: [
        "mediatechnologie",
        "media-technology"
    ],

    videoConference: [
        "videoconferentie",
        "videoconferencing",
        "video-conferencing"
    ],

    ourPartners: [
        "onze-partners",
        "our-partners"
    ],

    allPartners: [
        "alle-partners",
        "all-partners"
    ],

    about: [
        "daarom-dekom",
        "about-dekom",
        "why-dekom"
    ],

    company: [
        "ons-bedrijf",
        "our-company"
    ],

    references: [
        "referenties-case-studies",
        "references-case-studies",
        "references",
        "case-studies"
    ],

    aboutUs: [
        "over-ons",
        "about-us"
    ],

    process: [
        "alles-van-een-leverancier",
        "everything-from-a-single-source",
        "everything-from-one-source",
        "one-stop-shop"
    ],

    services: [
        "onze-diensten",
        "our-services",
        "services"
    ],

    topics: [
        "belangrijkste-onderwerpen",
        "key-topics",
        "important-topics"
    ],

    newsEvents: [
        "nieuws-en-events",
        "news-events",
        "news-and-events"
    ]
};


/*
 * ------------------------------------------------
 * Small helpers
 * ------------------------------------------------
 */

function slugMatches(
    value,
    aliases
) {

    if (!value) {
        return false;
    }

    return aliases.includes(
        value.toLowerCase()
    );
}


function safeSlug(
    value
) {

    return String(
        value || ""
    )
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}


function readJson(
    file
) {

    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );
}


function writeJson(
    file,
    data
) {

    fs.writeFileSync(
        file,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    );
}


function clearDirectory(
    folder
) {

    if (
        fs.existsSync(
            folder
        )
    ) {

        fs.rmSync(
            folder,
            {
                recursive: true,
                force: true
            }
        );
    }


    fs.mkdirSync(
        folder,
        {
            recursive: true
        }
    );
}


/*
 * ------------------------------------------------
 * URL path
 * ------------------------------------------------
 *
 * Converts:
 *
 *   https://www.dekom.com/nl-be/oplossingen/platform/zoom/zoom-rooms
 *
 * into:
 *
 *   [
 *       "oplossingen",
 *       "platform",
 *       "zoom",
 *       "zoom-rooms"
 *   ]
 */

function getPathSegments(
    url,
    siteId
) {

    const parsed =
        new URL(
            url
        );


    let segments =
        parsed.pathname
            .split("/")
            .filter(Boolean)
            .map(
                segment =>
                    decodeURIComponent(
                        segment
                    )
            );


    if (
        segments.length &&
        segments[0].toLowerCase() ===
            siteId.toLowerCase()
    ) {

        segments =
            segments.slice(
                1
            );
    }


    return segments;
}


/*
 * ------------------------------------------------
 * URL path for QC output
 * ------------------------------------------------
 *
 * Returns only the logical path beneath the language prefix.
 */

function getDisplayPath(
    url,
    siteId
) {

    const segments =
        getPathSegments(
            url,
            siteId
        );


    if (
        !segments.length
    ) {

        return "/";
    }


    return (
        "/" +
        segments.join("/")
    );
}


/*
 * ------------------------------------------------
 * Batch definition helper
 * ------------------------------------------------
 */

function makeClassification(
    id,
    section,
    priority,
    label
) {

    return {
        id,
        section,
        priority,
        label
    };
}


/*
 * ------------------------------------------------
 * Bulk partner temporary classification
 * ------------------------------------------------
 *
 * Bulk partner pages are first classified by vendor.
 *
 * A later grouping pass will:
 *
 * - keep larger vendor families together;
 * - group remaining small/singleton vendors into
 *   approximately balanced alphabetical batches.
 *
 * This avoids hard-coded alphabet ranges.
 */

function getBulkPartnerVendor(
    vendor
) {

    return safeSlug(
        vendor
    );
}


/*
 * ================================================================
 * CLASSIFICATION
 * ================================================================
 */

function classifyPage(
    page,
    siteId
) {

    const segments =
        getPathSegments(
            page.url,
            siteId
        );


    /*
     * ------------------------------------------------
     * Site root
     * ------------------------------------------------
     */

    if (
        !segments.length
    ) {

        return makeClassification(
            "site-overview",
            "site",
            5,
            "Site overview"
        );
    }


    const first =
        segments[0];

    const second =
        segments[1];

    const third =
        segments[2];

    const fourth =
        segments[3];


    /*
     * ------------------------------------------------
     * Top-level site section landing pages
     * ------------------------------------------------
     *
     * Review the homepage together with the three primary
     * header-section landing pages.
     */

    if (
        segments.length === 1 &&
        (
            slugMatches(
                first,
                ALIASES.solutions
            ) ||
            slugMatches(
                first,
                ALIASES.productsPartners
            ) ||
            slugMatches(
                first,
                ALIASES.about
            )
        )
    ) {

        return makeClassification(
            "site-overview",
            "site",
            5,
            "Site overview"
        );
    }


    /*
     * ------------------------------------------------
     * Solution section overview pages
     * ------------------------------------------------
     *
     * These peer landing pages describe the three main ways
     * DEKOM structures its solution offering:
     * platform, method, and workspace / room type.
     */

    if (
        slugMatches(
            first,
            ALIASES.solutions
        ) &&
        !third &&
        (
            second === "platform" ||
            second === "platforms" ||
            slugMatches(
                second,
                ALIASES.method
            ) ||
            slugMatches(
                second,
                ALIASES.workspace
            )
        )
    ) {

        return makeClassification(
            "solution-overviews",
            "solutions",
            8,
            "Solution overviews"
        );
    }


    /*
     * ================================================================
     * SOLUTIONS
     * ================================================================
     */

    if (
        slugMatches(
            first,
            ALIASES.solutions
        )
    ) {

        /*
         * ------------------------------------------------
         * Platform overview
         * ------------------------------------------------
         */

        if (
            (
            second === "platform" ||
            second === "platforms"
            ) &&
            !third
        ) {

            return makeClassification(
                "platform-overview",
                "platform",
                8,
                "Platform overview"
            );
        }


        /*
         * ------------------------------------------------
         * Individual platform families
         * ------------------------------------------------
         */

        if (
            (
            second === "platform" ||
            second === "platforms"
            ) &&
            third
        ) {

            const platform =
                safeSlug(
                    third
                );


            const priority =
                PLATFORM_PRIORITY[platform] !== undefined
                    ? PLATFORM_PRIORITY[platform]
                    : 80;


            return makeClassification(
                `platform-${platform}`,
                "platform",
                priority,
                `Platform: ${third}`
            );
        }


        /*
         * ------------------------------------------------
         * Workspace / room types
         * ------------------------------------------------
         */

        if (
            slugMatches(
                second,
                ALIASES.workspace
            )
        ) {

            return makeClassification(
                "workspace",
                "solutions",
                100,
                "Workspaces and room types"
            );
        }


        /*
         * ------------------------------------------------
         * Method / methodology
         * ------------------------------------------------
         */

        if (
            slugMatches(
                second,
                ALIASES.method
            )
        ) {

            if (
                third
            ) {

                return makeClassification(
                    `method-candidate-${safeSlug(third)}`,
                    "method",
                    120,
                    `Method: ${third}`
                );
            }


            return makeClassification(
                "method-general",
                "method",
                120,
                "Methods and approaches"
            );
        }


        /*
         * ------------------------------------------------
         * Other solution pages
         * ------------------------------------------------
         */

        return makeClassification(
            "solutions-other",
            "solutions",
            150,
            "Other solutions"
        );
    }


        /*
        * ================================================================
        * PRODUCTS / PARTNERS
        * ================================================================
        */

        if (
            slugMatches(
                first,
                ALIASES.productsPartners
            )
        ) {

        /*
         * ------------------------------------------------
         * Media technology
         * ------------------------------------------------
         */

        if (
            slugMatches(
                second,
                ALIASES.mediaTechnology
            )
        ) {

            if (
                third
            ) {

                return makeClassification(
                    `media-candidate-${safeSlug(third)}`,
                    "media-technology",
                    200,
                    `Media technology: ${third}`
                );
            }


            return makeClassification(
                "media-technology-general",
                "media-technology",
                200,
                "Media technology"
            );
        }


        /*
        * ------------------------------------------------
        * Videoconferencing hardware / products
        * ------------------------------------------------
        */

        if (
            slugMatches(
                second,
                ALIASES.videoConference
            )
        ) {

    if (
        third === "cameras" ||
        third === "videobars"
    ) {

        return makeClassification(
            "videoconferencing-video-hardware",
            "videoconferencing",
            230,
            "Video hardware: cameras & videobars"
        );
    }


    return makeClassification(
        "videoconferencing-general",
        "videoconferencing",
        232,
        "Videoconferencing products"
    );
}


        /*
         * ------------------------------------------------
         * Our partners
         * ------------------------------------------------
         */

        if (
            slugMatches(
                second,
                ALIASES.ourPartners
            )
        ) {

            /*
             * ------------------------------------------------
             * Partners landing page
             * ------------------------------------------------
             */

            if (
                !third
            ) {

                return makeClassification(
                    "products-partners-overview",
                    "products",
                    260,
                    "Products & Partners overview"
                );
            }


            /*
             * ------------------------------------------------
             * Bulk all-partners
             * ------------------------------------------------
             */

            if (
                slugMatches(
                    third,
                    ALIASES.allPartners
                )
            ) {

                /*
                 * Parent all-partners landing page
                 */

                if (
                    !fourth
                ) {

                    return makeClassification(
                        "products-partners-overview",
                        "products",
                        260,
                        "Products & Partners overview"
                    );
                }


                const bulkVendor =
                    getBulkPartnerVendor(
                        fourth
                    );


                if (
                    BULK_PARTNER_PLATFORM[bulkVendor]
                ) {

                    const platform =
                        BULK_PARTNER_PLATFORM[bulkVendor];


                    const priority =
                        PLATFORM_PRIORITY[platform] !== undefined
                            ? PLATFORM_PRIORITY[platform]
                            : 80;


                    return makeClassification(
                        `platform-${platform}`,
                        "platform",
                        priority,
                        `Platform: ${platform}`
                    );
                }


                return makeClassification(
                    `bulk-partner-candidate-${bulkVendor}`,
                    "bulk-partners",
                    910,
                    `Bulk partner: ${fourth}`
                );
            }

            /*
             * ------------------------------------------------
             * Major / featured partner family
             * ------------------------------------------------
             */

            const vendor =
                safeSlug(
                    third
                );


            /*
             * If this vendor has an explicit platform association,
             * review the vendor material together with that platform.
             */

            if (
                MAJOR_PARTNER_PLATFORM[vendor]
            ) {

                const platform =
                    MAJOR_PARTNER_PLATFORM[vendor];


                const priority =
                    PLATFORM_PRIORITY[platform] !== undefined
                        ? PLATFORM_PRIORITY[platform]
                        : 80;


                return makeClassification(
                    `platform-${platform}`,
                    "platform",
                    priority,
                    `Platform: ${platform}`
                );
            }


            /*
             * Smaller top-tier featured vendor families are reviewed
             * together to maintain useful comparison context.
             */

            if (
                GROUPED_FEATURED_PARTNERS.has(
                    vendor
                )
            ) {

                return makeClassification(
                    "partner-top-tier-group",
                    "partners",
                    300,
                    "Top-tier partners: HP Poly, Q-SYS, Shure & Yealink"
                );
            }


            /*
             * Otherwise it remains its own featured vendor batch.
             */

            return makeClassification(
                `partner-${vendor}`,
                "partners",
                300,
                `Partner: ${third}`
            );
        }


        /*
         * ------------------------------------------------
         * Product overview / search pages
         * ------------------------------------------------
         */

        return makeClassification(
            "products-partners-overview",
            "products",
            260,
            "Products & Partners overview"
        );
    }


    /*
     * ================================================================
     * WHY DEKOM / ABOUT
     * ================================================================
     */

    if (
        slugMatches(
            first,
            ALIASES.about
        )
    ) {

        /*
         * ------------------------------------------------
         * Company
         * ------------------------------------------------
         */

        if (
            slugMatches(
                second,
                ALIASES.company
            )
        ) {

            /*
             * References / case studies
             */

            if (
                slugMatches(
                    third,
                    ALIASES.references
                )
            ) {

                return makeClassification(
                    "about-references",
                    "about",
                    410,
                    "References and case studies"
                );
            }


            /*
             * About us branch
             */

            if (
                slugMatches(
                    third,
                    ALIASES.aboutUs
                )
            ) {

                return makeClassification(
                    "about-company",
                    "about",
                    400,
                    "About DEKOM"
                );
            }


            /*
             * Remaining company pages
             */

            return makeClassification(
                "about-company",
                "about",
                400,
                "About DEKOM"
            );
        }


        /*
         * ------------------------------------------------
         * How we operate / everything from one source
         * ------------------------------------------------
         */

        if (
            slugMatches(
                second,
                ALIASES.process
            )
        ) {

            return makeClassification(
                "about-process",
                "about",
                420,
                "How DEKOM works"
            );
        }


        /*
         * ------------------------------------------------
         * Services
         * ------------------------------------------------
         */

        if (
            slugMatches(
                second,
                ALIASES.services
            )
        ) {

            return makeClassification(
                "about-services",
                "about",
                430,
                "DEKOM services"
            );
        }


        /*
         * ------------------------------------------------
         * Key topics
         * ------------------------------------------------
         */

        if (
            slugMatches(
                second,
                ALIASES.topics
            )
        ) {

            return makeClassification(
                "about-topics",
                "about",
                440,
                "DEKOM key topics"
            );
        }


        /*
         * ------------------------------------------------
         * Unknown future About branch
         * ------------------------------------------------
         */

        if (
            second
        ) {

            return makeClassification(
                `about-${safeSlug(second)}`,
                "about",
                460,
                `About: ${second}`
            );
        }


        return makeClassification(
            "about-general",
            "about",
            450,
            "About DEKOM"
        );
    }


/*
 * ================================================================
 * NEWS
 * ================================================================
 */

if (
    first === "news"
) {

    /*
     * News landing page
     */

    if (
        !second
    ) {

        return makeClassification(
            "news-overview",
            "news",
            500,
            "News overview"
        );
    }


    /*
     * News article URLs currently contain a date in the slug:
     *
     * /news/4469/20260710-Projecting-Success
     *
     * Derive the year automatically.
     */

    const articleSlug =
        third || second;


    const yearMatch =
        String(
            articleSlug
        )
            .match(
                /^(20\d{2})/
            );


    if (
        yearMatch
    ) {

        const year =
            yearMatch[1];


        return makeClassification(
            `news-${year}`,
            "news",
            501 + (Number(year) - 2020),
            `News ${year}`
        );
    }


    /*
     * Fallback for a future news URL without a recognizable year.
     */

    return makeClassification(
        "news-other",
        "news",
        550,
        "Other news"
    );
}


    /*
     * ================================================================
     * NEWS & EVENTS
     * ================================================================
     */

    if (
        slugMatches(
            first,
            ALIASES.newsEvents
        )
    ) {

        return makeClassification(
            "events",
            "events",
            510,
            "News and events"
        );
    }


    /*
     * ================================================================
     * CONTACT
     * ================================================================
     */

    if (
        first === "contact"
    ) {

        return makeClassification(
            "contact",
            "utility",
            600,
            "Contact and campaign pages"
        );
    }


    /*
     * ================================================================
     * LEGAL / UTILITY
     * ================================================================
     */

    if (
        [
            "privacyverklaring",
            "privacy-policy",
            "privacypolicy",
            "algemene-voorwaarden",
            "terms-and-conditions",
            "terms"
        ].includes(
            String(
                first
            ).toLowerCase()
        )
    ) {

        return makeClassification(
            "legal",
            "utility",
            610,
            "Legal pages"
        );
    }


    /*
     * ================================================================
     * UNCLASSIFIED
     * ================================================================
     */

    return null;
}


/*
 * ================================================================
 * CANDIDATE BRANCH SPLITTING
 * ================================================================
 *
 * Some sections contain one substantial subtree plus several
 * standalone sibling pages.
 *
 * Examples currently include:
 *
 *   method/hybrid-work/...
 *   media-technology/display-solutions/...
 *
 * Rule:
 *
 * A candidate child branch containing at least 3 pages becomes its
 * own batch.
 *
 * Smaller child branches collapse into their section's general batch.
 */

function resolveCandidateGroups(
    records
) {

    const candidateCounts =
        new Map();


    for (
        const record
        of records
    ) {

        const classification =
            record.classification;


        if (
            !classification
        ) {

            continue;
        }


        if (
            classification.id.startsWith(
                "method-candidate-"
            ) ||
            classification.id.startsWith(
                "media-candidate-"
            )
        ) {

            candidateCounts.set(
                classification.id,
                (
                    candidateCounts.get(
                        classification.id
                    ) || 0
                ) + 1
            );
        }
    }


    for (
        const record
        of records
    ) {

        const classification =
            record.classification;


        if (
            !classification
        ) {

            continue;
        }


        /*
         * Method candidates
         */

        if (
            classification.id.startsWith(
                "method-candidate-"
            )
        ) {

            const count =
                candidateCounts.get(
                    classification.id
                ) || 0;


            if (
                count >= 3
            ) {

                classification.id =
                    classification.id.replace(
                        "method-candidate-",
                        "method-"
                    );


                classification.priority =
                    110;

            } else {

                classification.id =
                    "method-general";


                classification.label =
                    "Methods and approaches";


                classification.priority =
                    120;
            }
        }


        /*
         * Media technology candidates
         */

        if (
            classification.id.startsWith(
                "media-candidate-"
            )
        ) {

            const count =
                candidateCounts.get(
                    classification.id
                ) || 0;


            if (
                count >= 3
            ) {

                classification.id =
                    classification.id.replace(
                        "media-candidate-",
                        "media-"
                    );


                classification.priority =
                    190;

            } else {

                classification.id =
                    "media-technology-general";


                classification.label =
                    "Media technology";


                classification.priority =
                    200;
            }
        }
    }
}

/*
 * ================================================================
 * BULK PARTNER GROUPING
 * ================================================================
 *
 * Bulk partner pages are initially classified by vendor.
 *
 * This pass then:
 *
 * 1. counts pages belonging to each vendor;
 * 2. promotes substantial vendor families to their own batch;
 * 3. groups the remaining vendors alphabetically into batches
 *    targeting roughly 8 pages each.
 *
 * Vendor families are never split.
 */

function resolveBulkPartnerGroups(
    records
) {

    const vendors =
        new Map();


    /*
     * ------------------------------------------------
     * Collect records by vendor
     * ------------------------------------------------
     */

    for (
        const record
        of records
    ) {

        const classification =
            record.classification;


        if (
            !classification ||
            !classification.id.startsWith(
                "bulk-partner-candidate-"
            )
        ) {

            continue;
        }


        const vendor =
            classification.id.replace(
                "bulk-partner-candidate-",
                ""
            );


        if (
            !vendors.has(
                vendor
            )
        ) {

            vendors.set(
                vendor,
                []
            );
        }


        vendors
            .get(
                vendor
            )
            .push(
                record
            );
    }


    /*
     * ------------------------------------------------
     * Sort vendors alphabetically
     * ------------------------------------------------
     */

    const orderedVendors =
        [
            ...vendors.entries()
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    a[0].localeCompare(
                        b[0]
                    )
            );


    /*
     * ------------------------------------------------
     * Larger vendor families receive their own batch
     * ------------------------------------------------
     *
     * Three or more pages is enough to justify reviewing
     * the vendor family separately.
     */

    const remainingVendors = [];


    for (
        const [
            vendor,
            vendorRecords
        ]
        of orderedVendors
    ) {

        if (
            vendorRecords.length >= 3
        ) {

            for (
                const record
                of vendorRecords
            ) {

                record.classification.id =
                    `bulk-partner-${vendor}`;


                record.classification.label =
                    `Bulk partner: ${vendor}`;


                record.classification.priority =
                    910;
            }

        } else {

            remainingVendors.push(
                [
                    vendor,
                    vendorRecords
                ]
            );
        }
    }


    /*
     * ------------------------------------------------
     * Group remaining vendors into balanced batches
     * ------------------------------------------------
     *
     * Target approximately 8 pages, but never split a vendor.
     */

    const TARGET_PAGES =
        8;


    const groups = [];


    let currentGroup = [];
    let currentCount = 0;


    for (
        const [
            vendor,
            vendorRecords
        ]
        of remainingVendors
    ) {

        const vendorCount =
            vendorRecords.length;


        if (
            currentGroup.length &&
            currentCount + vendorCount >
                TARGET_PAGES
        ) {

            groups.push(
                currentGroup
            );


            currentGroup = [];
            currentCount = 0;
        }


        currentGroup.push(
            [
                vendor,
                vendorRecords
            ]
        );


        currentCount +=
            vendorCount;
    }


    if (
        currentGroup.length
    ) {

        groups.push(
            currentGroup
        );
    }


    /*
     * ------------------------------------------------
     * Assign stable human-readable group IDs
     * ------------------------------------------------
     */

    for (
        const group
        of groups
    ) {

        const firstVendor =
            group[0][0];


        const lastVendor =
            group[
                group.length - 1
            ][0];


        const groupId =
            firstVendor === lastVendor
                ? `bulk-partners-${firstVendor}`
                : `bulk-partners-${firstVendor}-to-${lastVendor}`;


        const groupLabel =
            firstVendor === lastVendor
                ? `All partners: ${firstVendor}`
                : `All partners: ${firstVendor} – ${lastVendor}`;


        for (
            const [
                ,
                vendorRecords
            ]
            of group
        ) {

            for (
                const record
                of vendorRecords
            ) {

                record.classification.id =
                    groupId;


                record.classification.label =
                    groupLabel;


                record.classification.priority =
                    920;
            }
        }
    }
}

/*
 * ================================================================
 * LOAD FULL PAGE
 * ================================================================
 */

function loadFullPage(
    pageDir,
    inventoryPage
) {

    const pageFile =
        path.join(
            pageDir,
            `${inventoryPage.filename}.json`
        );


    if (
        !fs.existsSync(
            pageFile
        )
    ) {

        throw new Error(
            `SEO page JSON missing: ${pageFile}`
        );
    }


    return readJson(
        pageFile
    );
}


/*
 * ================================================================
 * LOAD PAGE MARKDOWN
 * ================================================================
 */

function loadPageMarkdown(
    markdownDir,
    inventoryPage
) {

    const markdownFile =
        path.join(
            markdownDir,
            `${inventoryPage.filename}.md`
        );


    if (
        !fs.existsSync(
            markdownFile
        )
    ) {

        return null;
    }


    return fs.readFileSync(
        markdownFile,
        "utf8"
    );
}


/*
 * ================================================================
 * BATCH MARKDOWN
 * ================================================================
 */

function renderBatchMarkdown(
    batch,
    displayNumber,
    siteId
) {

    const lines = [];


    lines.push(
        `# SEO Batch ${displayNumber} — ${batch.label}`
    );

    lines.push("");

    lines.push(
        `Site: ${siteId}`
    );

    lines.push(
        `Batch ID: ${batch.id}`
    );

    lines.push(
        `Section: ${batch.section}`
    );

    lines.push(
        `Review status: TODO`
    );

    lines.push(
        `Pages: ${batch.pages.length}`
    );

    lines.push("");

    lines.push(
        "---"
    );

    lines.push("");


    batch.pages.forEach(
        (
            record,
            index
        ) => {

            const page =
                record.page;


            const inventory =
                record.inventory;


            lines.push(
                `# Page ${index + 1} — ${page.identity.label}`
            );

            lines.push("");


            lines.push(
                `URL: ${page.identity.url}`
            );


            if (
                page.hierarchy &&
                Array.isArray(
                    page.hierarchy.breadcrumbs
                ) &&
                page.hierarchy.breadcrumbs.length
            ) {

                lines.push(
                    `Breadcrumb: ${page.hierarchy.breadcrumbs.join(" > ")}`
                );
            }


            lines.push("");


            /*
            * Products overview/search pages are functional catalogue
            * interfaces. Their body content is not useful for SEO
            * title/description review, so include metadata only.
            */

            const metadataOnlyProductPage =
                /\/(alle-producten|producten-zoeken)\/?$/i.test(
                    page.identity.url || ""
                );


            if (batch.id === "products-partners-overview" && metadataOnlyProductPage) {
                lines.push(...formatCurrentSeoMetadata(inventory));
            } else if (record.markdown) {
                // Older cached page Markdown still contains the original metadata layout.
                const markdown = record.markdown.trim().replace(
                    /^## Current SEO metadata\r?\n\r?\nPublished title:[^\r\n]*\r?\nEditable title:[^\r\n]*\r?\nTitle length:[^\r\n]*\r?\nDescription:[^\r\n]*\r?\nDescription length:[^\r\n]*/m,
                    () => formatCurrentSeoMetadata(inventory).join("\n")
                );
                lines.push(markdown);
            } else {
                lines.push(...formatCurrentSeoMetadata(inventory));
            }


            lines.push("");
            lines.push("");

            lines.push(
                "---"
            );

            lines.push("");
        }
    );


    return lines.join(
        "\n"
    );
}


/*
 * ================================================================
 * QC BATCH TREE
 * ================================================================
 *
 * Lightweight visual representation of batch membership.
 *
 * Contains:
 *
 * - display number
 * - stable batch ID
 * - page count
 * - page paths only
 *
 * Deliberately excludes titles, descriptions and body content.
 */

function renderBatchTree(
    batches,
    siteId
) {

    const lines = [];


    lines.push(
        `# SEO batch tree — ${siteId}`
    );

    lines.push("");


    lines.push(
        `Batches: ${batches.length}`
    );

    lines.push("");


    for (
        const batch
        of batches
    ) {

        lines.push(
            `## ${batch.displayNumber} — ${batch.id}`
        );

        lines.push("");

        lines.push(
            `${batch.label}`
        );

        lines.push(
            `Pages: ${batch.pages.length}`
        );

        lines.push("");


        batch.pages.forEach(
            (
                record,
                index
            ) => {

                const prefix =
                    index ===
                    batch.pages.length - 1
                        ? "└──"
                        : "├──";


                lines.push(
                    `${prefix} ${getDisplayPath(
                        record.inventory.url,
                        siteId
                    )}`
                );
            }
        );


        lines.push("");
    }


    return lines.join(
        "\n"
    );
}


/*
 * ================================================================
 * MAIN
 * ================================================================
 */

function buildSeoBatches(
    siteId
) {

    if (
        !siteId
    ) {

        throw new Error(
            "Site ID is required."
        );
    }


    const seoDir =
        path.join(
            ".",
            "SEO",
            siteId
        );


    const indexFile =
        path.join(
            seoDir,
            "index.json"
        );


    const pageDir =
        path.join(
            seoDir,
            "pages"
        );


    const markdownDir =
        path.join(
            seoDir,
            "markdown"
        );


    const batchDir =
        path.join(
            seoDir,
            "batches"
        );


    /*
     * ------------------------------------------------
     * Input validation
     * ------------------------------------------------
     */

    if (
        !fs.existsSync(
            indexFile
        )
    ) {

        throw new Error(
            `SEO index does not exist: ${indexFile}`
        );
    }


    if (
        !fs.existsSync(
            pageDir
        )
    ) {

        throw new Error(
            `SEO page folder does not exist: ${pageDir}`
        );
    }


    /*
     * ------------------------------------------------
     * Load index
     * ------------------------------------------------
     */

    const inventory =
        readJson(
            indexFile
        );


    if (
        !Array.isArray(
            inventory
        )
    ) {

        throw new Error(
            `SEO index must contain an array: ${indexFile}`
        );
    }


    /*
     * ------------------------------------------------
     * Classify every current SEO page
     * ------------------------------------------------
     */

    const records =
        inventory.map(
            inventoryPage => ({

                inventory:
                    inventoryPage,

                classification:
                    classifyPage(
                        inventoryPage,
                        siteId
                    )
            })
        );


    /*
     * ------------------------------------------------
     * Promote substantial candidate branches
     * ------------------------------------------------
     */

resolveCandidateGroups(
    records
);


resolveBulkPartnerGroups(
    records
);


    /*
     * ------------------------------------------------
     * Load full page content and Markdown
     * ------------------------------------------------
     */

    for (
        const record
        of records
    ) {

        record.page =
            loadFullPage(
                pageDir,
                record.inventory
            );


        record.markdown =
            loadPageMarkdown(
                markdownDir,
                record.inventory
            );
    }


    /*
     * ------------------------------------------------
     * Build batch map
     * ------------------------------------------------
     */

    const batchMap =
        new Map();


    const unclassified =
        [];


    for (
        const record
        of records
    ) {

        const classification =
            record.classification;


        if (
            !classification
        ) {

            unclassified.push(
                record
            );

            continue;
        }


        if (
            !batchMap.has(
                classification.id
            )
        ) {

            batchMap.set(
                classification.id,
                {
                    id:
                        classification.id,

                    section:
                        classification.section,

                    priority:
                        classification.priority,

                    label:
                        classification.label,

                    reviewStatus:
                        "TODO",

                    pages:
                        []
                }
            );
        }


        batchMap
            .get(
                classification.id
            )
            .pages
            .push(
                record
            );
    }


    /*
     * ------------------------------------------------
     * Sort pages inside each batch
     * ------------------------------------------------
     */

    for (
        const batch
        of batchMap.values()
    ) {

        batch.pages.sort(
            (
                a,
                b
            ) => {

                const depthA =
                    a.inventory.depth || 0;


                const depthB =
                    b.inventory.depth || 0;


                if (
                    depthA !==
                    depthB
                ) {

                    return (
                        depthA -
                        depthB
                    );
                }


                return a.inventory.url
                    .localeCompare(
                        b.inventory.url
                    );
            }
        );
    }


    /*
     * ------------------------------------------------
     * Sort batches
     * ------------------------------------------------
     */

    const batches =
        [
            ...batchMap.values()
        ]
            .sort(
                (
                    a,
                    b
                ) => {

                    if (
                        a.priority !==
                        b.priority
                    ) {

                        return (
                            a.priority -
                            b.priority
                        );
                    }


                    return a.id
                        .localeCompare(
                            b.id
                        );
                }
            );


    /*
     * ------------------------------------------------
     * Assign display numbers
     * ------------------------------------------------
     */

    batches.forEach(
        (
            batch,
            index
        ) => {

            batch.displayNumber =
                String(
                    index + 1
                )
                    .padStart(
                        2,
                        "0"
                    );
        }
    );


    /*
     * ------------------------------------------------
     * Rebuild disposable batch folder
     * ------------------------------------------------
     */

    clearDirectory(
        batchDir
    );


    /*
     * ------------------------------------------------
     * Write batch JSON + Markdown
     * ------------------------------------------------
     */

    const manifestBatches = [];


    const summaryBatches = [];


    batches.forEach(
        batch => {

            const displayNumber =
                batch.displayNumber;


            const basename =
                `${displayNumber}-[TODO]-${batch.id}`;


            const batchJson = {

                id:
                    batch.id,

                displayNumber,

                label:
                    batch.label,

                section:
                    batch.section,

                priority:
                    batch.priority,

                reviewStatus:
                    "TODO",

                siteId,

                pageCount:
                    batch.pages.length,

                pages:
                    batch.pages.map(
                        record =>
                            record.page
                    )
            };


            writeJson(
                path.join(
                    batchDir,
                    `${basename}.json`
                ),
                batchJson
            );


            fs.writeFileSync(
                path.join(
                    batchDir,
                    `${basename}.md`
                ),
                renderBatchMarkdown(
                    batch,
                    displayNumber,
                    siteId
                ),
                "utf8"
            );


            const urls =
                batch.pages.map(
                    record =>
                        record.inventory.url
                );


            const paths =
                batch.pages.map(
                    record =>
                        getDisplayPath(
                            record.inventory.url,
                            siteId
                        )
                );


            manifestBatches.push({

                id:
                    batch.id,

                displayNumber,

                filename:
                    basename,

                label:
                    batch.label,

                section:
                    batch.section,

                priority:
                    batch.priority,

                reviewStatus:
                    "TODO",

                pageCount:
                    batch.pages.length,

                urls
            });


            summaryBatches.push({

                id:
                    batch.id,

                displayNumber,

                label:
                    batch.label,

                section:
                    batch.section,

                priority:
                    batch.priority,

                reviewStatus:
                    "TODO",

                pageCount:
                    batch.pages.length,

                paths
            });
        }
    );


    /*
     * ------------------------------------------------
     * Unclassified output
     * ------------------------------------------------
     */

    const unclassifiedJson = {

        siteId,

        pageCount:
            unclassified.length,

        pages:
            unclassified.map(
                record =>
                    record.page
            )
    };


    writeJson(
        path.join(
            batchDir,
            "_unclassified.json"
        ),
        unclassifiedJson
    );


    const unclassifiedLines = [];


    unclassifiedLines.push(
        "# Unclassified SEO pages"
    );

    unclassifiedLines.push("");


    unclassifiedLines.push(
        `Site: ${siteId}`
    );


    unclassifiedLines.push(
        `Pages: ${unclassified.length}`
    );

    unclassifiedLines.push("");


    for (
        const record
        of unclassified
    ) {

        unclassifiedLines.push(
            `- ${getDisplayPath(
                record.inventory.url,
                siteId
            )}`
        );
    }


    fs.writeFileSync(
        path.join(
            batchDir,
            "_unclassified.md"
        ),
        unclassifiedLines.join(
            "\n"
        ),
        "utf8"
    );


    /*
     * ------------------------------------------------
     * Coverage validation
     * ------------------------------------------------
     */

    const classifiedCount =
        batches.reduce(
            (
                total,
                batch
            ) =>
                total +
                batch.pages.length,
            0
        );


    const accountedFor =
        classifiedCount +
        unclassified.length;


    if (
        accountedFor !==
        inventory.length
    ) {

        throw new Error(
            `Batch coverage error: ` +
            `${accountedFor}/${inventory.length} pages accounted for.`
        );
    }


    /*
     * ------------------------------------------------
     * Manifest
     * ------------------------------------------------
     */

    const manifest = {

        siteId,

        generatedAt:
            new Date()
                .toISOString(),

        sourcePageCount:
            inventory.length,

        classifiedPageCount:
            classifiedCount,

        unclassifiedPageCount:
            unclassified.length,

        batchCount:
            batches.length,

        batches:
            manifestBatches
    };


    writeJson(
        path.join(
            batchDir,
            "manifest.json"
        ),
        manifest
    );


    /*
     * ------------------------------------------------
     * Lightweight QC summary
     * ------------------------------------------------
     */

    const batchSummary = {

        siteId,

        generatedAt:
            manifest.generatedAt,

        sourcePageCount:
            inventory.length,

        batchCount:
            batches.length,

        unclassifiedPageCount:
            unclassified.length,

        batches:
            summaryBatches
    };


    writeJson(
        path.join(
            batchDir,
            "batch-summary.json"
        ),
        batchSummary
    );


    /*
     * ------------------------------------------------
     * Lightweight human-readable batch tree
     * ------------------------------------------------
     */

    fs.writeFileSync(
        path.join(
            batchDir,
            "batch-tree.md"
        ),
        renderBatchTree(
            batches,
            siteId
        ),
        "utf8"
    );


    /*
     * ------------------------------------------------
     * Console summary
     * ------------------------------------------------
     */

    console.log("");


    console.log(
        `${siteId}: SEO batches built.`
    );


    console.log(
        `${siteId}: ${inventory.length} source pages.`
    );


    console.log(
        `${siteId}: ${batches.length} batches.`
    );


    console.log(
        `${siteId}: ${classifiedCount} classified pages.`
    );


    console.log(
        `${siteId}: ${unclassified.length} unclassified pages.`
    );


    console.log(
        `${siteId}: output written to ${batchDir}`
    );


    console.log(
        `${siteId}: QC tree written to ${path.join(
            batchDir,
            "batch-tree.md"
        )}`
    );


    return manifest;
}


module.exports =
    buildSeoBatches;