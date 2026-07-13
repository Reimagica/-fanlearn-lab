import HeroSection from '@/components/home/HeroSection'
import StatsCounter from '@/components/home/StatsCounter'
import LatestNews from '@/components/home/LatestNews'
import LatestTeam from '@/components/home/LatestTeam'
import LatestPublications from '@/components/home/LatestPublications'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsCounter />
      <LatestTeam />
      <LatestPublications />
      <LatestNews />
    </>
  )
}
