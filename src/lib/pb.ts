import PocketBase from 'pocketbase';

export const PB_URL: string = import.meta.env.VITE_PB_URL ?? 'https://pb-omni.16w.eu';

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);