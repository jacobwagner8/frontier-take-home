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
  });

  it("swaps caption and reveals the second-bond visual when toggled", async () => {
    const user = userEvent.setup();
    render(<SimulationScreen onAdvance={() => {}} />);

    await user.click(screen.getByRole("checkbox"));

    expect(
      screen.getByText(curriculum.simulationCaptions.twoBond),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Current now flowing on the EGC/i),
    ).toBeInTheDocument();
  });
});
