import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { TimeControl } from "./TimeControl";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("TimeControl", () => {
  it("renders the time text and no buttons when inactive", () => {
    const { getByText, queryAllByRole } = render(<TimeControl time="00:01.23" />);

    expect(getByText("00:01.23")).toBeInTheDocument();
    expect(queryAllByRole("button")).toHaveLength(0);
  });

  it("calls onAdd on a short click of the plus button", () => {
    const onAdd = vi.fn();
    const onLongPress = vi.fn();
    const { getAllByRole } = render(
      <TimeControl time="00:01.23" active onAdd={onAdd} onLongPress={onLongPress} />,
    );

    const plusButton = getAllByRole("button")[1]!;

    fireEvent.pointerDown(plusButton);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.pointerUp(plusButton);
    fireEvent.click(plusButton);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("calls onLongPress when held and suppresses the following click", () => {
    const onAdd = vi.fn();
    const onLongPress = vi.fn();
    const { getAllByRole } = render(
      <TimeControl time="00:01.23" active onAdd={onAdd} onLongPress={onLongPress} />,
    );

    const plusButton = getAllByRole("button")[1]!;

    fireEvent.pointerDown(plusButton);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(plusButton);
    fireEvent.click(plusButton);

    expect(onAdd).not.toHaveBeenCalled();
  });
});
