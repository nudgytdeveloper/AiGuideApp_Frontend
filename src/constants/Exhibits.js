export const EXHIBIT_LIST = [
  // {
  //   label: "TestExhibit-01",
  //   title: "TestExhibit-01",
  //   shortDescription:
  //     "Interactive automata that use gears, levers and other simple machines to show how mechanics and art can work together.",
  // },
  // {
  //   label: "Metamorphosis Plaza",
  //   title: "Metamorphosis Plaza",
  //   shortDescription:
  //     "The Metamorphosis Plaza is an interactive outdoor exhibit that welcomes guests to the Singapore Science Center. Including exhibits like Vox PopulAI and Prelude to Arcadia",
  // },
  {
    label: "Climate Changed",
    title: "Climate Changed",
    shortDescription:
      "Explore how Earth’s climate is shifting, how everyday actions affect it, and what we can do to drive climate action.",
  },
  {
    label: "Dialogue with Time",
    title: "Dialogue with Time – Embrace Ageing",
    shortDescription:
      "Experience-based gallery led by seniors that challenges stereotypes and invites visitors to rethink ageing.",
  },
  {
    label: "Earth Alive",
    title: "Earth Alive",
    shortDescription:
      "Hands-on gallery revealing the forces and processes that shape our dynamic planet, from quakes to weather systems.",
  },
  // {
  //   label: "Ecogarden",
  //   title: "Ecogarden",
  //   shortDescription:
  //     "Outdoor living lab featuring plants, animals and habitats where visitors can observe local biodiversity up close.",
  // },
  {
    label: "Energy Story",
    title: "Energy Story",
    shortDescription:
      "Permanent exhibition on where energy comes from, how it is transformed, and how we use it in modern life.",
  },
  {
    label: "Everyday Science",
    title: "Everyday Science",
    shortDescription:
      "See how science appears in daily life, from the sky above to microscopic worlds that we usually cannot see.",
  },
  {
    label: "Future Makers",
    title: "Future Makers",
    shortDescription:
      "Showcase of modern engineering and how engineers design solutions that impact individuals, industry and society.",
  },
  {
    label: "Going Viral",
    title: "Going Viral Travelling Exhibition",
    shortDescription:
      "Travelling exhibition tracing how science helps us understand viruses and develop tools to handle pandemics.",
  },
  // {
  //   label: "Kinetic Garden",
  //   title: "Kinetic Garden",
  //   shortDescription:
  //     "Outdoor exhibits that demonstrate different forms of energy and how they can be converted from one to another.",
  // },
  {
    label: "Know Your Poo",
    title: "Know Your Poo",
    shortDescription:
      "Playful but educational journey through the history of toilets, sanitation and how societies manage waste.",
  },
  {
    label: "Laser Maze",
    title: "Laser Maze Challenge",
    shortDescription:
      "Action game where visitors dodge and weave through a room filled with laser beams to test agility and timing.",
  },
  {
    label: "Phobia",
    title: "Phobia²: The Science of Fear",
    shortDescription:
      "Immersive spaces that let you face common fears while explaining the psychology and biology behind them.",
  },
  {
    label: "Mirror Maze",
    title: "Professor Crackitt's Light Fantastic Mirror Maze",
    shortDescription:
      "The Mirror Maze is a physics-based challenge, featuring a life-size labyrinth of mirrors with infinite reflections. It is the perfect location for an immersive, mind-bending adventure to locate Professor Crackitt’s lost parrot.",
  },
  {
    label: "Savage Garden",
    title: "Savage Garden",
    shortDescription:
      "Whimsical village of carnivorous plants that shows how these unusual species trap and digest their prey.",
  },
  {
    label: "Smart Nation PlayScape",
    title: "Smart Nation PlayScape",
    shortDescription:
      "Gamified exhibits explaining how digital technologies work and why they matter for Singapore’s Smart Nation vision.",
  },
  {
    label: "Some Call It Science",
    title: "Some Call It Science",
    shortDescription:
      "Play-driven space that encourages curiosity, experimentation and discovery through open-ended science activities.",
  },
  // {
  //   label: "The Giant Zoetrope",
  //   title: "The Giant Zoetrope",
  //   shortDescription:
  //     "Large spinning zoetrope that makes still figures appear to move, demonstrating the basics of animation.",
  // },
  {
    label: "Mind Eye",
    title: "The Mind’s Eye",
    shortDescription:
      "Optical illusion gallery showing how our brains can misinterpret what our eyes see.",
  },
  {
    label: "Tinkering Studio",
    title: "The Tinkering Studio",
    shortDescription:
      "Creative maker space where visitors build and experiment with familiar and unusual materials.",
  },
  // {
  //   label: "Tinkering Too",
  //   title: "Tinkering Too",
  //   shortDescription:
  //     "Ecogarden woodworking area where guests can learn simple woodworking skills through hands-on projects.",
  // },
  {
    label: "Urban Mutations",
    title: "Urban Mutations",
    shortDescription:
      "Explores how cities evolve, what challenges they face, and the kinds of urban futures we might design.",
  },
  {
    label: "Quanta School",
    title: "Quantum School",
    shortDescription:
      "The Quantum School exhibit is designed to introduce visitors to the basic principles of quantum physics and its emerging technologies. It features complex concepts like superposition, entanglement, and quantum computing in an accessible way.",
  },
  {
    label: "Animal Zone",
    title: "Animal Zone",
    shortDescription:
      "The Quantum School exhibit is designed to introduce visitors to the basic principles of quantum physics and its emerging technologies. It features complex concepts like superposition, entanglement, and quantum computing in an accessible way.",
  },
  {
    label: "Bioethics",
    title: "Bioethics",
    shortDescription:
      "The Bioethics Exhibition explores ethical issues arising from current technologies like AI in healthcare, gene editing, organoid research, and biological self-experimentation. It features immersive dioramas portraying AI robotic surgeries and gene editing in human embryos.",
  },
]

const normalize = (str) => str.trim().toLowerCase()
export const getExhibitInfoByLabel = (detectedLabel) => {
  if (!detectedLabel) return null

  const d = normalize(detectedLabel)

  return (
    EXHIBIT_LIST.find((exhibit) => {
      const e = normalize(exhibit.label)
      return e.includes(d) || d.includes(e)
    }) || null
  )
}
