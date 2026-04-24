/**
 * Video Carousel
 * Embla-powered horizontal carousel for 9:16 vertical videos
 */

class VideoCarousel {
  constructor(container) {
    this.container = container;
    this.viewport = container.querySelector('[data-carousel-viewport]');
    this.embla = null;
    this.videoItems = [];
    this.currentlyPlaying = null;
    this.dragOccurred = false;
    
    this.init();
  }
  
  init() {
    if (typeof EmblaCarousel === 'undefined') {
      console.warn('EmblaCarousel not loaded');
      return;
    }
    
    this.embla = EmblaCarousel(this.viewport, {
      align: 'start',
      containScroll: false,
      dragFree: true,
      loop: false,
      skipSnaps: true,
      inViewThreshold: 0.5,
    });
    
    // Find all video items
    const items = this.container.querySelectorAll('[data-video-item]');
    this.videoItems = Array.from(items).map((item, index) => {
      const video = item.querySelector('video');
      const playBtn = item.querySelector('[data-play-btn]');
      return { item, video, playBtn, index };
    });
    
    console.log('Video Carousel initialized with', this.videoItems.length, 'videos');
    
    this.setupDragDetection();
    this.setupClickHandler();
    this.setupVideoEndHandlers();
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAll();
      }
    });
  }
  
  setupDragDetection() {
    if (!this.embla) return;
    
    this.embla.on('pointerDown', () => {
      this.dragOccurred = false;
    });
    
    this.embla.on('scroll', () => {
      this.dragOccurred = true;
    });
  }
  
  setupClickHandler() {
    this.container.addEventListener('click', (e) => {
      const videoItem = e.target.closest('[data-video-item]');
      if (!videoItem) return;
      
      const index = this.videoItems.findIndex(v => v.item === videoItem);
      if (index === -1) return;
      
      if (this.dragOccurred) {
        this.dragOccurred = false;
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      this.toggleVideo(index);
    }, true);
  }
  
  setupVideoEndHandlers() {
    this.videoItems.forEach(({ video }, index) => {
      if (!video) return;
      
      // When video ends, reset to play state
      video.addEventListener('ended', () => {
        console.log('Video', index, 'ended');
        this.setVideoState(index, false);
        if (this.currentlyPlaying === index) {
          this.currentlyPlaying = null;
        }
        // Reset video to beginning
        video.currentTime = 0;
      });
      
      video.addEventListener('error', (e) => {
        console.error(`Video ${index} error:`, video.error);
      });
    });
  }
  
  toggleVideo(index) {
    const videoItem = this.videoItems[index];
    if (!videoItem || !videoItem.video) {
      console.warn('No video found at index', index);
      return;
    }
    
    const isPlaying = !videoItem.video.paused;
    
    if (isPlaying) {
      this.pauseVideo(index);
    } else {
      this.playVideo(index);
    }
  }
  
  playVideo(index) {
    const videoItem = this.videoItems[index];
    if (!videoItem || !videoItem.video) return;
    
    const video = videoItem.video;
    
    // Pause any currently playing video first
    if (this.currentlyPlaying !== null && this.currentlyPlaying !== index) {
      this.pauseVideo(this.currentlyPlaying);
    }
    
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.setVideoState(index, true);
          this.currentlyPlaying = index;
        })
        .catch((error) => {
          console.error('Video play failed:', error.name, error.message);
          this.setVideoState(index, false);
        });
    }
  }
  
  pauseVideo(index) {
    const videoItem = this.videoItems[index];
    if (!videoItem || !videoItem.video) return;
    
    videoItem.video.pause();
    this.setVideoState(index, false);
    
    if (this.currentlyPlaying === index) {
      this.currentlyPlaying = null;
    }
  }
  
  pauseAll() {
    this.videoItems.forEach(({ video }, index) => {
      if (video && !video.paused) {
        this.pauseVideo(index);
      }
    });
  }
  
  setVideoState(index, isPlaying) {
    const videoItem = this.videoItems[index];
    if (!videoItem) return;
    
    if (videoItem.item) {
      videoItem.item.classList.toggle('is-playing', isPlaying);
    }
    
    if (videoItem.playBtn) {
      videoItem.playBtn.setAttribute('aria-label', isPlaying ? 'Pause video' : 'Play video');
    }
  }
  
  destroy() {
    this.pauseAll();
    if (this.embla) {
      this.embla.destroy();
    }
  }
}

function initVideoCarousels() {
  const carousels = document.querySelectorAll('[data-video-carousel]');
  
  carousels.forEach((carousel) => {
    if (carousel.videoCarouselInstance) return;
    carousel.videoCarouselInstance = new VideoCarousel(carousel);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVideoCarousels);
} else {
  initVideoCarousels();
}

document.addEventListener('shopify:section:load', (event) => {
  const section = event.target;
  const carousel = section.querySelector('[data-video-carousel]');
  
  if (carousel && !carousel.videoCarouselInstance) {
    carousel.videoCarouselInstance = new VideoCarousel(carousel);
  }
});

document.addEventListener('shopify:section:unload', (event) => {
  const section = event.target;
  const carousel = section.querySelector('[data-video-carousel]');
  
  if (carousel && carousel.videoCarouselInstance) {
    carousel.videoCarouselInstance.destroy();
    delete carousel.videoCarouselInstance;
  }
});

window.VideoCarousel = VideoCarousel;