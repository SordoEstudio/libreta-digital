import Nav from '@/components/nav'
import Hero from '@/components/hero'
import PainPoints from '@/components/pain-points'
import ValueProps from '@/components/value-props'
import Features from '@/components/features'
import VideoDemo from '@/components/video-demo'
import CtaSection from '@/components/cta-section'
import Footer from '@/components/footer'

export default function HomePage() {
  return (
    <main>
      <Nav />
      <Hero />
      <PainPoints />
      <ValueProps />
      <Features />
      <VideoDemo />
      <CtaSection />
      <Footer />
    </main>
  )
}
