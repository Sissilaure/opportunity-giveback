import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import CountUp from "./CountUp";

// jsdom n'a ni IntersectionObserver ni matchMedia : on les simule pour piloter l'animation.
let declencher;
beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = () => ({ matches: false });
  window.IntersectionObserver = class {
    constructor(callback) {
      declencher = () => callback([{ isIntersecting: true }]);
    }
    observe() {}
    disconnect() {}
  };
  let t = 0;
  vi.spyOn(performance, "now").mockImplementation(() => t);
  window.requestAnimationFrame = (cb) =>
    setTimeout(() => {
      t += 100;
      cb(t);
    }, 100);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CountUp", () => {
  it("part de 0 puis atteint la valeur finale une fois visible", () => {
    const { container } = render(<CountUp valeur={42} duree={1000} />);
    expect(container.textContent).toBe("0");

    act(() => declencher());
    act(() => vi.advanceTimersByTime(2000));

    expect(container.textContent).toBe("42");
  });

  it("affiche directement la valeur si l'utilisateur réduit les animations", () => {
    window.matchMedia = () => ({ matches: true });
    const { container } = render(<CountUp valeur={7} />);
    expect(container.textContent).toBe("7");
    expect(screen.queryByText("0")).toBeNull();
  });
});
