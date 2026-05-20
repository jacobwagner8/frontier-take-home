import { describe, it, expect, vi } from "vitest";
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

describe("SimulationScreen Back button", () => {
  it("does not render Back when no onBack is provided", () => {
    render(<SimulationScreen onAdvance={() => {}} />);
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });

  it("renders Back when onBack is provided and invokes it on click", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<SimulationScreen onAdvance={() => {}} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("Back is enabled even before the toggle is engaged", () => {
    render(<SimulationScreen onAdvance={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("button", { name: /back/i })).toBeEnabled();
  });
});

describe("SimulationScreen continue gating", () => {
  it("disables Continue and shows a hint until the toggle is engaged", () => {
    render(<SimulationScreen onAdvance={() => {}} />);
    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();
    expect(screen.getByText(/try the toggle to continue/i)).toBeInTheDocument();
  });

  it("enables Continue and removes the hint after the first toggle interaction", async () => {
    const user = userEvent.setup();
    render(<SimulationScreen onAdvance={() => {}} />);

    await user.click(screen.getByRole("checkbox"));

    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeEnabled();
    expect(screen.queryByText(/try the toggle to continue/i)).toBeNull();
  });

  it("keeps Continue enabled after toggling back to the baseline", async () => {
    const user = userEvent.setup();
    render(<SimulationScreen onAdvance={() => {}} />);

    const toggle = screen.getByRole("checkbox");
    await user.click(toggle);
    await user.click(toggle);

    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });

  it("does not advance when the disabled Continue is clicked", async () => {
    const user = userEvent.setup();
    const onAdvance = vi.fn();
    render(<SimulationScreen onAdvance={onAdvance} />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onAdvance).not.toHaveBeenCalled();
  });
});

describe("SimulationScreen analytics callbacks", () => {
  it("calls onToggle each time the toggle is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <SimulationScreen onAdvance={() => {}} onToggle={onToggle} />,
    );
    const toggle = screen.getByRole("checkbox");
    await user.click(toggle);
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
