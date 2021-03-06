import Vue from 'vue';
import {SnotifyPrompt} from '../SnotifyPrompt';
import {SnotifyButton} from '../SnotifyButton';
import {SnotifyStyle} from '../../enums';
import { Component } from 'vue-property-decorator';
import {SnotifyToast} from './toast.model';

@Component({
  template: require('./toast.html'),
  props: ['toastData'],
  components: {
    SnotifyPrompt,
    SnotifyButton
  }
})
export class Toast extends Vue {
  toastData: SnotifyToast;
  toast = this.toastData;
  animationFrame = null;
  state = {
    paused: false,
    progress: 0,
    animation: '',
    isDestroying: false,
    promptType: SnotifyStyle.prompt
  };
  /**
   * Initialize base toast config
   */
  initToast () {
    if (this.toast.config.timeout > 0) {
      this.startTimeout(0);
    }
  }
  onClick () {
    this.toast.eventEmitter.$emit('click');
    if (this.toast.config.closeOnClick) {
      this.$snotify.remove(this.toast.id);
    }
  }
  onMouseEnter () {
    this.toast.eventEmitter.$emit('mouseenter');
    if (this.toast.config.pauseOnHover) {
      this.state.paused = true;
    }
  }
  onMouseLeave () {
    if (this.toast.config.pauseOnHover && this.toast.config.timeout) {
      this.state.paused = false;
      this.startTimeout(this.toast.config.timeout * this.state.progress);
    }
    this.toast.eventEmitter.$emit('mouseleave');
  }
  /**
   * Remove toast completely after animation
   */
  onExitTransitionEnd () {
    if (this.state.isDestroying) {
      return;
    }
    this.initToast();
    this.toast.eventEmitter.$emit('shown');
  }
  /**
   * Start progress bar
   * @param startTime {number}
   * @default 0
   */
  startTimeout(startTime = 0) {
    const start = performance.now();
    const calculate = () => {
      this.animationFrame = requestAnimationFrame((timestamp) => {
        const runtime = timestamp + startTime - start;
        const progress = Math.min(runtime / this.toast.config.timeout, 1);
        if (this.state.paused) {
          cancelAnimationFrame(this.animationFrame);
        } else if (runtime < this.toast.config.timeout) {
          this.state.progress = progress;
          calculate();
        } else {
          this.state.progress = 1;
          cancelAnimationFrame(this.animationFrame);
          this.$snotify.emitter.$emit('remove', this.toast.id);
        }
      });
    };
    calculate();
  }
  /**
   * Trigger beforeDestroy lifecycle. Removes toast
   */
  onRemove () {
    this.state.isDestroying = true;
    this.$emit('stateChanged', 'beforeHide');
    this.toast.eventEmitter.$emit('beforeHide');
    this.state.animation = this.toast.config.animation.exit;
    setTimeout(() => {
      this.$emit('stateChanged', 'hidden');
      this.state.animation = 'snotifyToast--out';
      this.toast.eventEmitter.$emit('hidden');
      setTimeout(() => this.$snotify.remove(this.toast.id, true), this.toast.config.animation.time / 2);
    }, this.toast.config.animation.time / 2);
  }
  created () {
    this.$snotify.emitter.$on('toastChanged', (toast) => {
      if (this.toast.id === toast.id) {
        this.initToast();
      }
    });
    this.$snotify.emitter.$on('remove', (id) => {
      if (this.toast.id === id) {
        this.onRemove();
      }
    });
  }
  mounted() {
    this.$nextTick(() => {
      this.toast.eventEmitter.$emit('mounted');
      this.state.animation = 'snotifyToast--in';
      this.$nextTick(() => {
        setTimeout(() => {
          this.$emit('stateChanged', 'beforeShow');
          this.toast.eventEmitter.$emit('beforeShow');
          this.state.animation = this.toast.config.animation.enter;
        }, this.toast.config.animation.time / 5); // time to show toast push animation (snotifyToast--in)
      });
    });
  }
  destroyed () {
    cancelAnimationFrame(this.animationFrame);
    this.toast.eventEmitter.$emit('destroyed');
  }
}
