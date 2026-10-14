import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

import { DURATION, EASE } from "./motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Draggable, InertiaPlugin);
  gsap.defaults({ ease: EASE.inOut, duration: DURATION.base });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { Draggable, gsap, ScrollTrigger, SplitText, useGSAP };
