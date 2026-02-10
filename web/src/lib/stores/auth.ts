import { writable } from 'svelte/store';

export type AuthUser = {
	id: string;
	email: string;
	email_verified: boolean;
	name: string;
	picture?: string | null;
	provider: string;
};

export const user = writable<AuthUser | null>(null);
export const authLoading = writable(true);

let initialized = false;

export async function initAuth(force = false) {
	if (initialized && !force) return;
	initialized = true;

	try {
		const res = await fetch('/api/auth/me');
		if (res.ok) {
			const data = (await res.json()) as AuthUser;
			user.set(data);
		}
	} finally {
		authLoading.set(false);
	}
}
