import AboutEntry from './AboutEntry'
import Band from './Band'
import About from './About'
import Projects from './Projects'
import Certificates from './Certificates'
import Contact from './Contact'
import DropBy from './DropBy'

/**
 * Everything below the hero. It's its own chunk and mounts a moment after the first paint
 * (while the loading screen is still up), so opening the page is one short task instead of
 * rendering the whole site at once.
 */
export default function Sections() {
  return (
    <>
      {/* rises over the last screen of the pinned hero: the dusk darkens into the page, no edge */}
      <AboutEntry>
        <Band />
        <About />
      </AboutEntry>
      <Projects />
      <Certificates />
      <DropBy />
      <Contact />
    </>
  )
}
