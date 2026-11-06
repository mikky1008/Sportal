// Component tests for the coach's My Athletes page. Mock data only; no API or database.
// CoachLayout is not under test, so the page's inner component is rendered directly.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyAthletes } from "@/pages/MyAthletes";
import { connectedAthletes } from "@/data/coachAthletes";

afterEach(cleanup);
const cards = () => within(screen.getByRole("list", { name: "Connected athletes" })).getAllByRole("listitem");

describe("list", () => {
  it("shows every connected athlete with sport, position and school", () => {
    render(<MyAthletes />);
    expect(cards()).toHaveLength(4);
    expect(screen.getByText("Total Connected: 4 Athletes")).toBeTruthy();
    const juan = cards()[0]!;
    for (const t of ["Juan Dela Cruz", "Basketball", "Point Guard", "Ateneo de Manila University"]) expect(within(juan).getByText(t)).toBeTruthy();
    expect(juan.querySelector("img")).not.toBeNull(); // profile photo (Juan has one)
    expect(cards()[1]!.querySelector("img")).toBeNull(); // the others show initials
  });
  it("has a View Athlete Profile button on every card", () => {
    render(<MyAthletes />);
    expect(screen.getAllByRole("button", { name: /^View .+ profile$/ })).toHaveLength(4);
  });
});

describe("search", () => {
  it("search by name is case-insensitive", async () => {
    render(<MyAthletes />);
    await userEvent.type(screen.getByLabelText("Search athletes by name"), "kEVIN");
    expect(cards()).toHaveLength(1);
    expect(within(cards()[0]!).getByText("Kevin Ramos")).toBeTruthy();
  });
  it("has no sport filter", () => {
    render(<MyAthletes />);
    expect(screen.queryByLabelText("Filter by sport")).toBeNull();
  });
  it("shows the no-results state and Clear Search restores the list", async () => {
    render(<MyAthletes />);
    await userEvent.type(screen.getByLabelText("Search athletes by name"), "zzzz");
    expect(screen.getByText("No Connected Athletes Found")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Clear Search" }));
    expect(cards()).toHaveLength(4);
    expect((screen.getByLabelText("Search athletes by name") as HTMLInputElement).value).toBe("");
  });
});

describe("profile popup", () => {
  it("opens with profile, skills, achievements and records, then closes", async () => {
    render(<MyAthletes />);
    await userEvent.click(screen.getByRole("button", { name: "View Juan Dela Cruz's profile" }));
    const dialog = screen.getByRole("dialog");
    for (const t of ["Athlete Profile Details", "Juan Dela Cruz", "Biography", "Evaluated Skills", "Ball Handling", "Career Achievements",
      "2025 UAAP Season MVP Candidate", "Recent Logged Records", "Free Throw Precision", "88%"]) expect(within(dialog).getAllByText(new RegExp(t.replace(/[()]/g, "\\$&"))).length).toBeGreaterThan(0);
    await userEvent.click(within(dialog).getByRole("button", { name: "Close Profile" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("closes with Escape", async () => {
    render(<MyAthletes />);
    await userEvent.click(screen.getByRole("button", { name: "View Kevin Ramos's profile" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("opens the right athlete", async () => {
    render(<MyAthletes />);
    await userEvent.click(screen.getByRole("button", { name: "View Alyssa Mendoza's profile" }));
    expect(within(screen.getByRole("dialog")).getByText("Track & Field • Sprinter (100m / 200m)")).toBeTruthy();
  });
});

describe("empty state", () => {
  it("shows a message and no search controls when nobody is connected", () => {
    render(<MyAthletes athletes={[]} />);
    expect(screen.getByText("No connected athletes yet")).toBeTruthy();
    expect(screen.getByText("Total Connected: 0 Athletes")).toBeTruthy();
    expect(screen.queryByLabelText("Search athletes by name")).toBeNull();
  });
  it("uses the singular for one athlete", () => {
    render(<MyAthletes athletes={[connectedAthletes[0]!]} />);
    expect(screen.getByText("Total Connected: 1 Athlete")).toBeTruthy();
  });
});
