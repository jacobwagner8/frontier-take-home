import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SimulationScreen } from "@/components/SimulationScreen";
import { curriculum } from "@/lib/curriculum";

describe("SimulationScreen toggle behavior", () => {
  it("starts with the one-bond caption and no EGC current warning", () => {
    render(<SimulationScreen onAdvance={() => {}} />);
    expect(
      screen.getByText(curriculum.simulationCaptions.oneBond),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Current now flowing on the EGC/i)).toBeNull();
    expect(screen.queryByText(/≈ 5 V/)).toBeNull();
  });

  it("retains the one-bond caption and appends the second-bond delta when toggled", async () => {
    const user = userEvent.setup();
    render(<SimulationScreen onAdvance={() => {}} />);

    await user.click(screen.getByRole("checkbox"));

    expect(
      screen.getByText(curriculum.simulationCaptions.oneBond),
    ).toBeInTheDocument();
    expect(screen.getByText(/What changed\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(curriculum.simulationCaptions.twoBond.mechanism),
    ).toBeInTheDocument();
    expect(
      screen.getByText(curriculum.simulationCaptions.twoBond.hazard),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Current now flowing on the EGC/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/≈ 5 V/)).toBeInTheDocument();
  });
});
