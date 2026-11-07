// Test fixture for the My Athletes component tests. NOT used by the app: the app reads /api/coach/athletes.
import juanPhoto from "@/assets/juan.jpg";
import type { ConnectedAthlete } from "@/lib/coachApi";

export const connectedAthletes: ConnectedAthlete[] = [
  {
    id: "ca-001", firstName: "Juan", lastName: "Dela Cruz", photo: juanPhoto,
    sport: "Basketball", position: "Point Guard", school: "Ateneo de Manila University",
    rank: 14, performance: 92.5, consistency: 87,
    bio: "Dedicated point guard focusing on high-tempo transition play and jumper efficiency.",
    skills: ["Ball Handling", "Court Vision", "3-Point Shooting", "Perimeter Defense"],
    achievements: [
      { title: "2025 UAAP Season MVP Candidate", year: "2025" },
      { title: "Team Captain - Ateneo Blue Eagles", year: "2026" },
    ],
    records: [
      { label: "Free Throw Precision", date: "Oct 24, 2026", value: "88%" },
      { label: "10m Sprint Speed", date: "Oct 18, 2026", value: "1.42s" },
    ],
  },
  {
    id: "ca-002", firstName: "Kevin", lastName: "Ramos",
    sport: "Basketball", position: "Shooting Guard", school: "De La Salle University",
    rank: 8, performance: 94.1, consistency: 91,
    bio: "Catch-and-shoot specialist who spaces the floor and rarely misses from the corners.",
    skills: ["Catch-and-Shoot", "Off-Ball Movement", "Free Throws", "Transition Defense"],
    achievements: [{ title: "UAAP Season 88 All-Rookie Team", year: "2025" }],
    records: [
      { label: "Three-Point Accuracy", date: "Oct 26, 2026", value: "46%" },
      { label: "Free Throw Precision", date: "Oct 20, 2026", value: "91%" },
    ],
  },
  {
    id: "ca-003", firstName: "Marco", lastName: "Villanueva",
    sport: "Volleyball", position: "Outside Hitter", school: "University of Santo Tomas",
    rank: 3, performance: 89.8, consistency: 84,
    bio: "Powerful outside hitter with a heavy serve. Working on reception under pressure.",
    skills: ["Spike Power", "Jump Serve", "Blocking", "Court Coverage"],
    achievements: [
      { title: "UAAP Juniors Best Outside Hitter", year: "2024" },
      { title: "Team Most Improved Player", year: "2025" },
    ],
    records: [
      { label: "Spike Accuracy", date: "Oct 25, 2026", value: "81%" },
      { label: "Vertical Jump", date: "Oct 15, 2026", value: "74 cm" },
    ],
  },
  {
    id: "ca-004", firstName: "Alyssa", lastName: "Mendoza",
    sport: "Track & Field", position: "Sprinter (100m / 200m)", school: "University of the Philippines",
    rank: 1, performance: 96.8, consistency: 95,
    bio: "Sprinter with a fast, clean start and the steadiest times on the squad.",
    skills: ["Block Start", "Top-End Speed", "Curve Running", "Recovery"],
    achievements: [
      { title: "UAAP 100m Silver Medalist", year: "2026" },
      { title: "NCR Meet 200m Record Holder", year: "2025" },
    ],
    records: [
      { label: "100m Sprint", date: "Oct 27, 2026", value: "11.84s" },
      { label: "200m Sprint", date: "Oct 19, 2026", value: "24.31s" },
    ],
  },
];
