"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Diamond, Award, Shield, Heart, ArrowRight } from "lucide-react"
import { useLocale } from "@/i18n/locale-context"

const values = [
  {
    icon: Diamond,
    title: "Excellence",
    description: "We source only the finest diamonds and gemstones, ensuring each piece meets our exacting standards.",
  },
  {
    icon: Award,
    title: "Craftsmanship",
    description: "Our master jewelers bring decades of experience to every creation, blending tradition with innovation.",
  },
  {
    icon: Shield,
    title: "Trust",
    description: "Every piece comes with certification and our lifetime guarantee, giving you complete peace of mind.",
  },
  {
    icon: Heart,
    title: "Passion",
    description: "We believe jewelry is more than adornmentâ€”it's a celebration of life's most precious moments.",
  },
]

const milestones = [
  { year: "1985", title: "Founded", description: "M&G Jewelry was established in New York City" },
  { year: "1995", title: "First Flagship", description: "Opened our iconic Fifth Avenue showroom" },
  { year: "2005", title: "Global Expansion", description: "Extended our presence to major cities worldwide" },
  { year: "2015", title: "Digital Innovation", description: "Launched our award-winning online experience" },
  { year: "2024", title: "Sustainability", description: "Achieved carbon-neutral operations" },
]

export default function AboutPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-5xl font-semibold mb-6">{t("about.title")}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("about.subtitle")}
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-square rounded-2xl overflow-hidden">
              <Image
                src="/placeholder.svg?height=600&width=600"
                alt="M&G Jewelry workshop"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="text-primary font-medium">{t("about.ourStory")}</span>
              <h2 className="text-3xl font-semibold mt-2 mb-6">{t("about.storyTitle")}</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t("about.storyP1")}</p>
                <p>{t("about.storyP2")}</p>
                <p>{t("about.storyP3")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold mb-4">{t("about.valuesTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("about.valuesSubtitle")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="bg-card/50 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold mb-4">{t("about.journeyTitle")}</h2>
            <p className="text-muted-foreground">{t("about.journeySubtitle")}</p>
          </div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 hidden md:block" />
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.year}
                  className={`flex flex-col md:flex-row items-center gap-4 ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-primary font-semibold">{milestone.year}</p>
                        <h3 className="font-medium">{milestone.title}</h3>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0 z-10 hidden md:block" />
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-4">{t("about.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">{t("about.ctaSubtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/collections">
                {t("about.exploreCollections")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/white-glove">{t("about.bookConsultation")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

