interface TwitchPlayerOptions {
  channel?: string;
  width?: string | number;
  height?: string | number;
  parent?: string[];
  muted?: boolean;
  autoplay?: boolean;
}

interface TwitchPlayerInstance {
  addEventListener(event: string, callback: () => void): void;
  removeEventListener(event: string, callback: () => void): void;
  destroy(): void;
  setChannel(channel: string): void;
  getChannel(): string;
  getMuted(): boolean;
  setMuted(muted: boolean): void;
  getVolume(): number;
  setVolume(volume: number): void;
}

interface TwitchPlayerConstructor {
  new (containerId: string, options: TwitchPlayerOptions): TwitchPlayerInstance;
  OFFLINE: string;
  ONLINE: string;
  PLAYING: string;
  READY: string;
}

interface Window {
  Twitch?: {
    Player: TwitchPlayerConstructor;
  };
}
