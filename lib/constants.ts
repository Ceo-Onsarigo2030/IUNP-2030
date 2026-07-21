export const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/pillars", label: "Pillars" },
  { href: "/articles", label: "Articles" },
  { href: "/feedback", label: "Your Voice" },
];

export const SOCIALS = {
  uninexus: {
    instagram: "https://www.instagram.com/uninexus_connect?igsh=MWswaWlpcHJvYW01Nw==",
    facebook: "https://www.facebook.com/share/1RQqh4SqcJ/",
    tiktok: "https://tiktok.com/@uninexus_connect",
    email: "uninexusplatformke@gmail.com",
  },
  baConnect: {
    facebook: "https://www.facebook.com/share/1BLYCuVKHn/",
    instagram: "https://www.instagram.com/b.a_connect_organization?igsh=a2F6c2o0a2Q4ZzVt",
    linkedin: "https://www.linkedin.com/company/bridging-academia-connect-organization/",
    tiktok: "https://tiktok.com/@b.a_connect_organization",
    website: "https://bridgingacademiaconnectorganization-rho.vercel.app/",
  },
};

export const SLOGAN = "Bridging Campus. Building Futures.";

export type MemberCategory = "institution" | "affiliation" | "other";

export const MEMBER_CATEGORIES: { value: MemberCategory; label: string; hint: string }[] = [
  {
    value: "institution",
    label: "University, College or Tertiary Institution",
    hint: "e.g. Kenyatta University, Kiriri Women's University",
  },
  {
    value: "affiliation",
    label: "Affiliation, Organization or Association",
    hint: "e.g. organization, association, youth group",
  },
  {
    value: "other",
    label: "Other",
    hint: "e.g. alumni, well-wisher, any youth",
  },
];

export const PILLARS = [
  {
    slug: "disability-inclusion",
    icon: "Accessibility",
    title: "Disability Inclusion & Accessibility",
    tagline: "A higher-education space where students with disabilities lead, learn and thrive on equal footing.",
    summary:
      "We champion accessible events, assistive-tech access and policy advocacy across every campus we touch.",
    body: [
      "Across Kenyan campuses, students with disabilities still navigate inaccessible lecture halls, scarce assistive technology and exam systems that were not built with them in mind. Inter-Universities Nexus partners with disability rights organisations, learning institutions like KISE, and student leaders living with disabilities to co-design programs that move from charity to genuine inclusion.",
      "We track accessibility commitments by university, publish progress, and elevate disabled students into leadership rooms where decisions actually get made.",
    ],
    philosophy: "Access is not a favour we extend — it is a standard every campus owes its students.",
  },
  {
    slug: "talent-innovation",
    icon: "Sparkles",
    title: "Talent & Innovation Development",
    tagline: "Where future-makers get seen.",
    summary:
      "From music and art to AI prototypes and startup pitches, we give Kenya's most gifted students a stage, a network and a runway.",
    body: [
      "Talent without exposure dies quietly. We exist so it does not. The Nexus runs national showcases, pitch competitions and creator residencies that put student talent in front of investors, recruiters, labels and industry leaders.",
      "We back the winners with cash prizes, mentorship and warm introductions, and we follow up — because one trophy night is not a career. Flagship initiatives include the Inter-Universities Nexus Gala Awards.",
    ],
    philosophy: "A gift shown once is a moment. A gift backed with a network is a career.",
  },
  {
    slug: "gender-equity",
    icon: "Scale",
    title: "Gender Equity, Inclusion & Empowerment",
    tagline: "Safe nation. Equal seats.",
    summary:
      "We mobilise students around GBV prevention, sexual reproductive health rights and equal economic opportunity.",
    body: [
      "Gender equity is not a slogan to us. It is a measurable outcome: how safe a woman feels walking back to her hostel, how many female student leaders sit on senate committees, how survivors are believed and supported.",
      "We anchor our work in instruments Kenya has ratified — CEDAW, the Maputo Protocol, the Sexual Offences Act — and translate them into campus-level programs, peer-led training and direct action during the global 16 Days of Activism.",
    ],
    philosophy: "Equity is measured in seats held, not statements made.",
  },
  {
    slug: "mental-health",
    icon: "HeartPulse",
    title: "Mental Health Awareness & Wellness Advocacy",
    tagline: "It is okay to not be okay.",
    summary:
      "We bring mental wellness out of the shadows through walks, peer-counselling training and access to affordable therapy.",
    body: [
      "Behind every academic transcript is a youth carrying invisible weight. Anxiety, depression, financial pressure, post-traumatic stress, loneliness — the data tells us they are everywhere, and the silence around them costs lives.",
      "We partner with the Kenya Counselling and Psychological Association, university wellness offices and licensed practitioners to make mental health support normal, affordable and stigma-free on every campus we touch.",
    ],
    philosophy: "Silence is not strength. Support is.",
  },
  {
    slug: "civic-leadership",
    icon: "Landmark",
    title: "GenZ Civic Education, Leadership & Governance",
    tagline: "A generation that knows the constitution.",
    summary:
      "We equip the next generation of Kenyan leaders to understand the constitution, engage policy and run for office.",
    body: [
      "Kenya's GenZ is the most politically awake generation in our history, but raw energy without civic literacy can be redirected, misled, or burnt out. We build that literacy: constitutional rights, devolution, public finance, the legislative process, peaceful organising and digital civic safety.",
      "We host debates, simulations of parliament and county assemblies, and direct engagement with sitting leaders — so that when this generation shows up, it shows up prepared.",
    ],
    philosophy: "Power respects the citizen who understands it.",
  },
] as const;
