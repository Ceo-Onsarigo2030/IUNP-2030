import type { Metadata } from "next";
import Image from "next/image";
import { Target, Eye, Compass } from "lucide-react";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="bg-cream">
      <section className="surface-ink py-16 sm:py-20">
        <div className="container text-center">
          <p className="eyebrow mb-3">About us</p>
          <h1 className="heading-display text-4xl sm:text-5xl text-cream">A national stage for youth excellence</h1>
        </div>
      </section>

      <section className="container py-14 sm:py-20 max-w-3xl">
        <div className="space-y-5 text-ink/75 leading-relaxed text-[15px] sm:text-base">
          <p>
            The Inter–Universities Nexus Platform, a flagship initiative of B.A Connect Organization, is a
            transformative youth-centered platform created to bring together youths from universities, colleges,
            associations, youth organizations and tertiary institutions across Kenya and beyond into one vibrant
            space for talent development, creativity, innovation, learning, and opportunity.
          </p>
          <p>
            It was established from a simple but powerful belief: young people possess immense potential, but many
            lack the right platforms, exposure, mentorship, and support systems needed to fully realize and showcase
            their abilities. Inter–Universities Nexus exists to bridge that gap.
          </p>
          <p>
            The platform provides a credible and inclusive national stage where young people can discover their
            strengths, nurture their talents, showcase creativity, advance innovative ideas, and build practical
            skills that prepare them for the future. Whether in arts, leadership, entrepreneurship, technology,
            research, sports, advocacy, or creative industries, the platform is designed to recognize and elevate
            youth excellence while opening pathways to visibility, partnerships, mentorship, recognition, and
            meaningful opportunities for growth.
          </p>
          <p>
            More than a showcase platform, Inter–Universities Nexus is a space for purposeful engagement and
            transformative dialogue. Through forums, summits, exhibitions, competitions, mentorship programs, and
            strategic youth events, the platform addresses pressing issues affecting students and young people
            today, including entrepreneurship development, employability, technology and AI integration, financial
            literacy, leadership and governance, mental health awareness, innovation, social inclusion, and civic
            education.
          </p>
          <p>
            At its core, Inter–Universities Nexus Platform reflects B.A Connect Organization&apos;s commitment to
            building a generation of empowered, innovative, skilled, and socially conscious young leaders — a
            generation confident in its abilities, prepared for emerging opportunities, and ready to make meaningful
            contributions to Kenya&apos;s development, Africa&apos;s progress, and the global community.
          </p>
        </div>
      </section>

      <section className="container pb-20 grid sm:grid-cols-3 gap-5">
        <div className="card-elegant p-7">
          <Target className="size-7 text-gold-deep mb-4" />
          <h2 className="font-display text-2xl mb-3">Mission</h2>
          <p className="text-sm text-ink/65 leading-relaxed">
            To create a unified and inclusive network for universities, youth organizations, associations and
            colleges that promotes youth empowerment, leadership development, talent recognition, policy engagement,
            innovation, civic education and sustainable opportunities through strategic partnership and
            collaborative action.
          </p>
        </div>
        <div className="card-elegant p-7">
          <Eye className="size-7 text-gold-deep mb-4" />
          <h2 className="font-display text-2xl mb-3">Vision</h2>
          <p className="text-sm text-ink/65 leading-relaxed">
            To become Africa&apos;s leading inter-university collaborative platform, nurturing a generation of
            empowered, innovative, socially responsible and globally competitive student leaders.
          </p>
        </div>
        <div className="card-elegant p-7">
          <Compass className="size-7 text-gold-deep mb-4" />
          <h2 className="font-display text-2xl mb-3">Core philosophy</h2>
          <p className="text-sm text-ink/65 leading-relaxed">
            Universities, colleges, youth organizations and associations should not exist in isolation. They should
            collaborate, innovate and grow together for the betterment of society.
          </p>
        </div>
      </section>
    </div>
  );
}
