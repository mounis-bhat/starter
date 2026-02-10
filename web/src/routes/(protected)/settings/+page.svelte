<script lang="ts">
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let loading = $state(false);

	async function handleChangePassword() {
		error = null;
		success = null;
		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;
		try {
			const res = await fetch('/api/auth/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					current_password: currentPassword,
					new_password: newPassword
				})
			});
			if (!res.ok) {
				const payload = (await res.json()) as { error?: string };
				throw new Error(payload.error ?? 'Unable to change password');
			}
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			success = 'Password updated';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unable to change password';
		} finally {
			loading = false;
		}
	}
</script>

<main class="mx-auto max-w-md p-8">
	<h1 class="mb-6 text-3xl font-bold">Settings</h1>

	{#if error}
		<div class="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{error}</div>
	{/if}
	{#if success}
		<div class="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">{success}</div>
	{/if}

	<form
		onsubmit={(e: Event) => {
			e.preventDefault();
			handleChangePassword();
		}}
		class="space-y-4"
	>
		<div>
			<label for="current" class="mb-1 block text-sm font-medium">Current password</label>
			<input
				id="current"
				type="password"
				bind:value={currentPassword}
				required
				class="w-full rounded border px-3 py-2"
			/>
		</div>
		<div>
			<label for="new" class="mb-1 block text-sm font-medium">New password</label>
			<input
				id="new"
				type="password"
				bind:value={newPassword}
				required
				class="w-full rounded border px-3 py-2"
			/>
			<p class="mt-2 text-xs text-gray-500">
				Min 8 chars, include uppercase, number, and special character.
			</p>
		</div>
		<div>
			<label for="confirm" class="mb-1 block text-sm font-medium">Confirm new password</label>
			<input
				id="confirm"
				type="password"
				bind:value={confirmPassword}
				required
				class="w-full rounded border px-3 py-2"
			/>
		</div>
		<button
			type="submit"
			disabled={loading}
			class="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
		>
			{loading ? 'Updating...' : 'Update password'}
		</button>
	</form>
</main>
