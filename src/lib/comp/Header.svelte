<script>
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiAccount, mdiTranslate, mdiDatabase, mdiAlert, mdiMenu } from '@mdi/js';
	import { m } from '$lib/paraglide/messages.js';
	import { onMount, onDestroy } from 'svelte';
	import { getLocalRawDb, startLiveSync, stopLiveSync } from '$lib/db';
	import { pb } from '$lib/pb';

	// 1. Declaración correcta de Props en Svelte 5
	let { onDatabaseHashChange = () => {}, toggleSidebar = () => {} } = $props();
	let username = $derived(pb.authStore?.model?.name ?? null);
</script>

<nav aria-label="Breadcrumb" class="breadcrumbs no-print">
	<div style="display: flex; align-items: center; gap: 5px; flex-wrap: nowrap;">
		<button class="menu-toggle" onclick={toggleSidebar}>
			<SvgIcon path={mdiMenu} type="mdi" size="1.5em" />
		</button>
		<a class="short-name" href="/" style="font-weight: bold;">{m.app_name_short()}</a>
		<a class="long-name" href="/" style="font-weight: bold;">{m.app_name()}</a>
	</div>
	<div
		style="display: flex; align-items: center; gap: 2.5px; flex-wrap: wrap; justify-content: flex-end;"
	>
		<details class="language-switcher-container">
			<summary>
				<SvgIcon type="mdi" path={mdiTranslate} size="24" />
			</summary>
			<select
				class="language-switcher"
				onchange={(e) => setLocale(e.target.value)}
				value={getLocale()}
			>
				<option value="es">Español</option>
				<option value="en">English</option>
				<option value="eu">Euskara</option>
			</select>
		</details>
		{#if pb.authStore?.model?.id}
			<a href="/profile" class="database-switcher-container">
				<SvgIcon type="mdi" path={mdiAccount} size="24" />
				<span class="database-switcher">{username}</span>
			</a>
		{:else}
			<a href="/login" class="database-switcher-container">
				<SvgIcon type="mdi" path={mdiAccount} size="24" />
				<span class="database-switcher">Iniciar sesión</span>
			</a>
		{/if}
	</div>
</nav>

<style>
	.language-switcher,
	.database-switcher {
		border: none;
		background: var(--accent);
		color: white;
		font-size: 16px;
		width: auto !important;
		margin: 0;
		padding: 0;
		height: 100%;
	}
	.language-switcher-container,
	.database-switcher-container {
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 5px;
		margin: 0;
		color: white;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0px;
		flex-wrap: wrap;
	}
	.language-switcher-container summary,
	.database-switcher-container summary {
		list-style: none;
		display: flex;
		flex-direction: row;
	}
	/* @media (prefers-color-scheme: dark) {
		.language-switcher-container,
		.database-switcher-container {
			color: white;
		}
	} */
	.short-name {
		display: none;
	}
	@media (max-width: 700px) {
		.short-name {
			display: block;
		}
		.long-name {
			display: none;
		}
	}
	.menu-toggle {
		background: transparent;
		border: none;
		color: white;
		cursor: pointer;
		padding: 0 2.5px;
	}
</style>
