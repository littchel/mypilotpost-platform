function ratioValue(ratio) {
  const [w, h] = String(ratio || "1:1").split(":").map(Number);
  if (!w || !h) return 1;
  return w / h;
}

/**
 * Design compatibility score, separate from topical relevance.
 * 0–100. A relevant photo can still score low if it fights the composition.
 */
export function scoreMediaDesign(candidate, slot) {
  if (!candidate || !slot) return { score: 0, reasons: ["missing"] };
  const reasons = [];
  let score = 40;

  const target = ratioValue(slot.aspectRatio);
  const width = candidate.width || candidate.w;
  const height = candidate.height || candidate.h;
  if (width && height && slot.width && slot.height && (width < slot.width || height < slot.height)) {
    score -= 50;
    reasons.push("below_slot_resolution");
  }

  if (width && height) {
    const actual = width / height;
    const delta = Math.abs(actual - target) / target;
    if (delta < 0.08) {
      score += 30;
      reasons.push("aspect_match");
    } else if (delta < 0.2) {
      score += 15;
      reasons.push("aspect_close");
    } else {
      score -= 20;
      reasons.push("aspect_mismatch");
    }
  }

  const focal = candidate.focalPoint || candidate.focal;
  if (focal && slot.focalPoint) {
    const dx = Math.abs((focal.x ?? 0.5) - slot.focalPoint.x);
    const dy = Math.abs((focal.y ?? 0.5) - slot.focalPoint.y);
    if (dx + dy < 0.35) {
      score += 20;
      reasons.push("focal_compatible");
    } else {
      score -= 10;
      reasons.push("focal_conflict");
    }
  }

  if (slot.negativeSpace && slot.negativeSpace !== "none") {
    const subjectSide = candidate.subjectSide || candidate.subject_side;
    if (subjectSide && subjectSide !== slot.negativeSpace) {
      score += 10;
      reasons.push("negative_space");
    } else if (subjectSide && subjectSide === slot.negativeSpace) {
      score -= 15;
      reasons.push("subject_in_text_zone");
    }
  }

  if (candidate.hasText || candidate.text_in_image) {
    score -= 25;
    reasons.push("text_in_image");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export function rankMediaForSlot(candidates, slot, relevanceOf = () => 0) {
  return [...(candidates || [])]
    .map((candidate) => {
      const design = scoreMediaDesign(candidate, slot);
      const relevance = Number(relevanceOf(candidate)) || 0;
      return {
        candidate,
        designScore: design.score,
        relevance,
        reasons: design.reasons,
        total: design.score * 0.6 + relevance * 0.4,
      };
    })
    .sort((a, b) => b.total - a.total);
}
