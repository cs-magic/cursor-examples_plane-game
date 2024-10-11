console.log('加载音频模块');

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function createSound(type, options) {
    return () => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(options.frequency, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(options.gain, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + options.duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + options.duration);
    };
}

const sounds = {
    shoot: createSound('sine', { frequency: 660, gain: 0.1, duration: 0.1 }),
    explosion: createSound('sawtooth', { frequency: 100, gain: 0.5, duration: 0.3 }),
    powerUp: createSound('square', { frequency: 440, gain: 0.2, duration: 0.2 }),
    gameOver: createSound('triangle', { frequency: 220, gain: 0.3, duration: 1 })
};

function playSound(sound) {
    if (sounds[sound]) {
        sounds[sound]();
    }
}

let bgmOscillator = null;
let bgmGain = null;

function playBGM() {
    if (bgmOscillator) stopBGM();
    
    bgmOscillator = audioCtx.createOscillator();
    bgmOscillator.type = 'sine';
    bgmOscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
    
    bgmGain = audioCtx.createGain();
    bgmGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    
    bgmOscillator.connect(bgmGain);
    bgmGain.connect(audioCtx.destination);
    
    bgmOscillator.start();
    console.log('开始播放背景音乐');
}

function stopBGM() {
    if (bgmOscillator) {
        bgmOscillator.stop();
        bgmOscillator = null;
        bgmGain = null;
    }
    console.log('停止播放背景音乐');
}

console.log('音频模块加载完成');