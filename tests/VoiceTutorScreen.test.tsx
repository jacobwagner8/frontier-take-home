import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceTutorScreen } from "@/components/VoiceTutorScreen";

const startRealtimeSession = vi.fn();
vi.mock("@/lib/realtimeClient", () => ({
  startRealtimeSession: (...args: unknown[]) => startRealtimeSession(...args),
}));

describe("VoiceTutorScreen Back button", () => {
  beforeEach(() => {
    startRealtimeSession.mockReset();
    vi.unstubAllGlobals();
  });

  it("does not render Back when no onBack is provided", () => {
    render(<VoiceTutorScreen onAdvance={() => {}} />);
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });

  it("voice mode: invokes onBack when no call has been started", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<VoiceTutorScreen onAdvance={() => {}} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /^back$/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("voice mode: tears down the live call before invoking onBack", async () => {
    const user = userEvent.setup();
    const events: string[] = [];
    const onBack = vi.fn(() => events.push("onBack"));
    const stop = vi.fn(() => events.push("stop"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ value: "ek_test" }), { status: 200 }),
      ),
    );
    startRealtimeSession.mockResolvedValue({
      pc: {},
      remoteAudio: {},
      dataChannel: {},
      stop,
    });

    render(<VoiceTutorScreen onAdvance={() => {}} onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: /^start$/i }));
    await waitFor(() => expect(startRealtimeSession).toHaveBeenCalled());
    await screen.findByText(/listening/i);

    await user.click(screen.getByRole("button", { name: /^back$/i }));

    expect(stop).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["stop", "onBack"]);
  });

  it("text mode: passes onBack through to TextRecapChat (no realtime fetch)", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<VoiceTutorScreen onAdvance={() => {}} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /type instead/i }));
    await user.click(screen.getByRole("button", { name: /^back$/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
