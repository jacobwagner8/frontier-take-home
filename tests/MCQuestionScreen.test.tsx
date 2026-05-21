import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MCQuestionScreen } from "@/components/MCQuestionScreen";
import { curriculum } from "@/lib/curriculum";
import type { MCQ } from "@/lib/curriculum.types";

describe("MCQuestionScreen Back button", () => {
  it("does not render Back when no onBack is provided", () => {
    render(<MCQuestionScreen mcq={curriculum.mcq1} onAdvance={() => {}} />);
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });

  it("invokes onBack when clicked with no option selected", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onAdvance = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={onAdvance}
        onBack={onBack}
      />,
    );

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("invokes onBack regardless of selection (does not submit)", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onAdvance = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={onAdvance}
        onBack={onBack}
      />,
    );

    const radios = screen.getAllByRole("radio");
    await user.click(radios[0]);
    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });
});

describe("MCQuestionScreen wrong-answer inline flow", () => {
  it("renders remediation text inline when a wrong option is submitted", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByText(wrong.remediation as string, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("calls onWrongAttempt with the chosen option and does NOT call onAdvance", async () => {
    const user = userEvent.setup();
    const onAdvance = vi.fn();
    const onWrongAttempt = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={onAdvance}
        onWrongAttempt={onWrongAttempt}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onWrongAttempt).toHaveBeenCalledTimes(1);
    expect(onWrongAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ id: wrong.id }),
    );
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("disables radios after a wrong submit until Try again is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }

    await user.click(screen.getByRole("button", { name: /try again/i }));

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeDisabled();
    }
    expect(
      screen.queryByText(wrong.remediation as string, { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("renders Ask a follow-up only when the wrong option has a misconceptionTag", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const taggedWrong = curriculum.mcq1.options.find(
      (o) => !o.isCorrect && o.misconceptionTag,
    )!;
    await user.click(screen.getByLabelText(taggedWrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByRole("button", { name: /ask a follow-up/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render Ask a follow-up when the wrong option lacks a misconceptionTag", async () => {
    const user = userEvent.setup();
    const untaggedMcq: MCQ = {
      id: "test_untagged",
      prompt: "Test question",
      rationale: "Test rationale.",
      options: [
        {
          id: "test_a",
          text: "A wrong option without a tag",
          isCorrect: false,
          remediation: "Test remediation copy.",
        },
        { id: "test_b", text: "The correct option", isCorrect: true },
      ],
    };
    render(
      <MCQuestionScreen
        mcq={untaggedMcq}
        onAdvance={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    await user.click(screen.getByLabelText("A wrong option without a tag"));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.queryByRole("button", { name: /ask a follow-up/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps Back visible after a wrong submit", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={() => {}}
        onWrongAttempt={() => {}}
        onBack={onBack}
      />,
    );
    const wrong = curriculum.mcq1.options.find((o) => !o.isCorrect)!;
    await user.click(screen.getByLabelText(wrong.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    const backBtn = screen.getByRole("button", { name: /back/i });
    await user.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("MCQuestionScreen correct-answer inline flow", () => {
  it("renders the MCQ's rationale and a Next button when correct is submitted", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={() => {}}
        onWrongAttempt={() => {}}
      />,
    );
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    await user.click(screen.getByLabelText(correct.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.getByText(curriculum.mcq1.rationale, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /submit/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT call onAdvance on the Submit click; calls it only on Next", async () => {
    const user = userEvent.setup();
    const onAdvance = vi.fn();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={onAdvance}
        onWrongAttempt={() => {}}
      />,
    );
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    await user.click(screen.getByLabelText(correct.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onAdvance).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("hides Back after a correct submit", async () => {
    const user = userEvent.setup();
    render(
      <MCQuestionScreen
        mcq={curriculum.mcq1}
        onAdvance={() => {}}
        onWrongAttempt={() => {}}
        onBack={() => {}}
      />,
    );
    const correct = curriculum.mcq1.options.find((o) => o.isCorrect)!;
    await user.click(screen.getByLabelText(correct.text));
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      screen.queryByRole("button", { name: /back/i }),
    ).not.toBeInTheDocument();
  });
});
