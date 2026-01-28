export const DEFAULT_MISSION = {
  id: "mission-future-scientist",
  title: "Mission: Become a Future Scientist",
  zones: [
    {
      id: "zone-1",
      label: "Mechanics Alive",
      spaceName: "Mechanics Alive",
      question:
        "Which of the following item can be found inside the mechanics alive exhibit?",
      options: [
        "Earthquake Simulator",
        "Simple Machines",
        "Fire Tornado",
        "Light Maze"
      ],
      answerIndex: 1,
      funFact:
        "Mechanics Alive lets you explore how simple machines like levers, pulleys, and gears work together to make heavy tasks easier in everyday life.",
      wrongHint: "Almost! Let’s go to this exhibit and look for the clue 👀"
    },
    {
      id: "zone-2",
      label: "HALL A",
      spaceName: "HALL A",
      question: "What does the Urban Mutations exhibition cover?",
      options: ["Mutants", "Urban Animals", "Evolution", "Urban Design"],
      answerIndex: 3,
      funFact:
        "Urban Mutations shows how cities evolve over time, revealing how architecture, technology, and human needs shape the way we live in urban spaces.",
      wrongHint: "Not quite—look around the area for the answer 👨‍🚀"
    },
    {
      id: "zone-3",
      label: "Hall B",
      spaceName: "Hall B",
      question:
        "What is the name of the main character in the Climate Action Show? ",
      options: ["Sheepy", "Ducky", "Mooey", "Cheepy"],
      answerIndex: 0,
      funFact:
        "The Climate Action Show teaches how everyday actions—like saving energy and reducing waste—can help protect Earth and fight climate change.",
      wrongHint: "Close—head to the exhibit show and look for the big clue 🔍"
    }
  ]
}
