import './style.scss';
import Lenis from 'lenis';
import gsap from 'gsap';
import { Draggable } from 'gsap/draggable';

const lenis = new Lenis({
  duration: 1,
  lerp: 1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 2,
  infinite: false,
});

const raf = (time) => {

  lenis.raf(time);
  requestAnimationFrame(raf);
};

requestAnimationFrame(raf);



gsap.registerPlugin(Draggable);

/**
 * LoopAnimation
 * @typedef {Object} LoopAnimationOptions
 * @property {number} [duration=20] - 1ループにかかる秒数
 * @property {'toLeft'|'toRight'} [direction='toLeft'] - 流れるデフォルト方向
 * @property {boolean} [isDraggable=true] - ドラッグ操作の有効/無効
 * @property {Object.<string, Partial<LoopAnimationOptions>>} [responsive] - レスポンシブ設定
 */
class LoopAnimation {
  /**
   * @param {HTMLElement} element - アニメーションを適用する親要素
   * @param {LoopAnimationOptions} [options={}] - アニメーションの設定値
   */
  constructor(element, options = {}) {
    this.parentElement = element;
    this.defaults = {
      duration: 20,
      direction: 'toLeft',
      isDraggable: true,
      responsive: null
    };

    this.settings = { ...this.defaults, ...options };
    this.timeline = null;
    this.draggable = null;

    this.init();
  }

  init = () => {
    this.contentsElements = this.parentElement.querySelectorAll('.loop-contents');
    this.setupAll();
    window.addEventListener('resize', this.setupAll);
  };

  setupAll = () => {
    this.contentsElements.forEach((content) => {
      this.setupAnimation(content);
    });
  };

  setupAnimation = (content) => {
    const items = content.querySelectorAll('.loop-item');
    let activeSettings = { ...this.settings };

    if (this.settings.responsive) {
      const sortedQueries = Object.keys(this.settings.responsive).sort((a, b) => {
        const widthA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const widthB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return widthA - widthB;
      });

      for (const query of sortedQueries) {
        if (window.matchMedia(`(${query})`).matches) {
          Object.assign(activeSettings, this.settings.responsive[query]);
          break;
        }
      }
    }

    this.applyGSAP(content, items, activeSettings);
  };

  applyGSAP = (content, items, settings) => {
    const isToRight = settings.direction === 'toRight';
    const duration = settings.duration;

    // 既存のDraggableとTimelineをリセット
    if (this.draggable && this.draggable[0]) {
        this.draggable[0].kill();
        this.draggable = null;
    }
    if (this.timeline) this.timeline.kill();

    gsap.killTweensOf(items);

    this.timeline = gsap.timeline({ repeat: -1 });
    this.timeline.set(items, { xPercent: isToRight ? -100 : 0 });
    this.timeline.to(items, {
      xPercent: isToRight ? 0 : -100,
      duration: duration,
      ease: 'none',
    });

    // ドラッグが無効設定の場合はここで終了
    if (!settings.isDraggable) return;

    // ドラッグ設定
    const proxy = document.createElement('div');
    const wrap = gsap.utils.wrap(0, 1);
    let lastDeltaX = 0;

    this.draggable = Draggable.create(proxy, {
      trigger: content,
      type: 'x',
      inertia: false,
      onPress: () => {
        this.timeline.pause();
        gsap.killTweensOf(this.timeline);
        lastDeltaX = 0;
      },
      onDrag: () => {
        const dragInstance = this.draggable[0];
        const totalWidth = content.offsetWidth;
        const moveProgress = dragInstance.deltaX / totalWidth;
        const currentProgress = this.timeline.progress();
        const directionMultiplier = isToRight ? 1 : -1;

        this.timeline.progress(wrap(currentProgress + (moveProgress * directionMultiplier)));
        lastDeltaX = dragInstance.deltaX;
      },
      onRelease: () => {
        const velocityX = lastDeltaX;
        if (Math.abs(velocityX) < 2) {
          this.timeline.play();
          gsap.to(this.timeline, { timeScale: 1, duration: 0.5 });
          return;
        }
        const isForward = isToRight ? velocityX > 0 : velocityX < 0;
        const boost = Math.min(Math.abs(velocityX), 8);
        const finalTimeScale = isForward ? boost : -boost;

        this.timeline.timeScale(finalTimeScale).play();
        gsap.to(this.timeline, { timeScale: 1, duration: 2.0, ease: "power2.out" });
      }
    });
  };
}

/**
 * プロトタイプ拡張
 */
[Element, NodeList, HTMLCollection].forEach((constructor) => {
  constructor.prototype.loopAnimation = function (options) {
    if (this instanceof Element) {
      new LoopAnimation(this, options);
    } else {
      Array.from(this).forEach((el) => {
        if (el instanceof Element) new LoopAnimation(el, options);
      });
    }
    return this;
  };
});



document.querySelectorAll('.loop--01').loopAnimation({
  duration: 20,
  direction: 'toLeft', // 左方向へ流れる
  isDraggable: true, // ドラッグ・スワイプ有効
  responsive: {
    'max-width: 768px': {
      //direction: 'toRight', // スマホでは右方向へ
      duration: 30
    }
  }
});