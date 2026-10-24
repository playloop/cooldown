/**
 * Turns uneven frame times into a whole number of equal simulation steps.
 * Leftover time carries into the next frame, so nothing is lost or doubled.
 */
export class FixedStep {
  private carry = 0;

  constructor(
    private readonly step: number,
    private readonly maxFrameSeconds: number,
  ) {}

  /** How many steps to run for a frame that took `frameSeconds`. */
  advance(frameSeconds: number): number {
    this.carry += Math.min(Math.max(frameSeconds, 0), this.maxFrameSeconds);
    // The epsilon keeps float error from turning exactly two steps into 1.9999.
    const steps = Math.floor(this.carry / this.step + 1e-9);
    this.carry = Math.max(0, this.carry - steps * this.step);
    return steps;
  }
}
