import { useState } from "react";
import { Star } from "lucide-react";

type StarRatingProps = {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
};

export function StarRating({
  value,
  onChange,
  size = 20,
  readOnly = false,
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= active;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onClick={() => !readOnly && onChange?.(star)}
            className={`transition-transform ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              style={{ width: size, height: size }}
              className={
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-white/30"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
