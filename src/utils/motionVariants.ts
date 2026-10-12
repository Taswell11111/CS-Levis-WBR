import { Variants } from 'framer-motion';

/**
 * Subtle compositor-only entry animations for WBR Report components.
 * Follows design constitution:
 * - Animates only opacity, transform (y), and subtle scale.
 * - Uses human-tuned smooth settling curve [0.16, 1, 0.3, 1].
 * - Snappy, non-blocking duration (320ms - 400ms).
 */

export const kpiContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03
    }
  }
};

export const kpiCardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 14,
    scale: 0.985
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.38,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

export const tableVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 12 
  },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      delay: 0.06 + Math.min(custom * 0.035, 0.25),
      ease: [0.16, 1, 0.3, 1]
    }
  })
};

export const sectionContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  }
};

