<script>
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiAccount, mdiTranslate, mdiDatabase, mdiAlert, mdiMenu } from '@mdi/js';
	import { m } from '$lib/paraglide/messages.js';
	import { onMount, onDestroy } from 'svelte';
	import { getLocalRawDb, startLiveSync, stopLiveSync } from '$lib/db';

	// 1. Declaración correcta de Props en Svelte 5
	let { username = '', onDatabaseHashChange = () => {}, toggleSidebar = () => {} } = $props();

	let databases = $state([]);
	let activeDatabaseId = $state('');
	const sharedColorDocumentId = 'galileo_shared_color';

	function loadDatabases() {
		try {
			const raw = localStorage.getItem('pouchdb_connections_v1');
			databases = raw ? JSON.parse(raw) : [];

			const active = localStorage.getItem('active_database_id');
			if (active) {
				activeDatabaseId = active;
			} else if (databases.length > 0) {
				activeDatabaseId = databases[0].id;
				localStorage.setItem('active_database_id', activeDatabaseId);
			} else {
				activeDatabaseId = '';
			}
		} catch (e) {
			databases = [];
			activeDatabaseId = '';
		}
	}

	function getActiveDbConfig() {
		return databases.find((d) => d.id === activeDatabaseId) || null;
	}

	function getChangeHash(value) {
		const sequence = Number(value);
		if (Number.isFinite(sequence)) {
			return sequence;
		}

		const sequencePrefix = Number.parseFloat(String(value ?? ''));
		return Number.isFinite(sequencePrefix) ? sequencePrefix : 0;
	}

	function notifyDatabaseHash(value) {
		onDatabaseHashChange(getChangeHash(value));
	}

	async function notifySharedDatabaseColor() {
		const config = getActiveDbConfig();
		if (!config) {
			notifyDatabaseHash('');
			return;
		}

		try {
			const colorDocument = await getLocalRawDb(config.localDatabase).get(sharedColorDocumentId);
			notifyDatabaseHash(colorDocument.hue);
		} catch (error) {
			if (error.status !== 404) {
				notifyDatabaseHash(0);
				return;
			}

			const hue = Math.random() * 360;
			try {
				await getLocalRawDb(config.localDatabase).put({
					_id: sharedColorDocumentId,
					hue
				});
				notifyDatabaseHash(hue);
			} catch (putError) {
				if (putError.status === 409) {
					const colorDocument = await getLocalRawDb(config.localDatabase).get(
						sharedColorDocumentId
					);
					notifyDatabaseHash(colorDocument.hue);
				}
			}
		}
	}

	async function advanceSharedDatabaseColor() {
		const config = getActiveDbConfig();
		if (!config) return;

		try {
			const db = getLocalRawDb(config.localDatabase);
			const colorDocument = await db.get(sharedColorDocumentId);
			const hue = Number(colorDocument.hue) + 1;
			await db.put({ ...colorDocument, hue });
			notifyDatabaseHash(hue);
		} catch (error) {
			if (error.status === 409) {
				notifySharedDatabaseColor();
			}
		}
	}

	function startSyncForActiveDb() {
		const config = getActiveDbConfig();
		if (!config || !config.syncEnabled) return;

		// Always stop any existing sync for this config before starting a new one
		stopLiveSync(config.id);

		startLiveSync(config, {
			onChange: (event) => {
				const documents = event?.change?.docs ?? [];
				const colorDocument = documents.find((document) => document._id === sharedColorDocumentId);
				if (colorDocument) {
					notifyDatabaseHash(colorDocument.hue);
				}
				if (
					event?.direction === 'push' &&
					documents.some((document) => document._id !== sharedColorDocumentId)
				) {
					advanceSharedDatabaseColor();
				}
			},
			onError: (err) => console.warn('LiveSync error:', err)
		});
	}

	function stopSyncForActiveDb() {
		const config = getActiveDbConfig();
		if (config) {
			stopLiveSync(config.id);
		}
	}

	function handleDatabaseChange(e) {
		// Stop sync for the old database
		stopSyncForActiveDb();

		const newId = e.target.value;
		activeDatabaseId = newId;
		localStorage.setItem('active_database_id', newId);
		notifySharedDatabaseColor();

		// Start sync for the new database
		startSyncForActiveDb();

		// Dispatch a custom event so other components can listen to database changes
		window.dispatchEvent(new CustomEvent('database-changed', { detail: { id: newId } }));
	}

	onMount(() => {
		loadDatabases();
		startSyncForActiveDb();
		notifySharedDatabaseColor();

		// Listen to storage changes (e.g. if databases are added/removed in settings)
		const handleStorage = (e) => {
			if (e.key === 'pouchdb_connections_v1' || e.key === 'active_database_id') {
				loadDatabases();
			}
		};

		const handleDbUpdated = () => {
			loadDatabases();
			startSyncForActiveDb();
		};

		window.addEventListener('storage', handleStorage);
		// Also listen to local custom events within the same tab
		window.addEventListener('database-updated', handleDbUpdated);

		return () => {
			window.removeEventListener('storage', handleStorage);
			window.removeEventListener('database-updated', handleDbUpdated);
		};
	});

	onDestroy(() => {
		stopSyncForActiveDb();
	});
</script>

<nav aria-label="Breadcrumb" class="breadcrumbs no-print">
	<div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
		<button class="menu-toggle" onclick={toggleSidebar}>
			<SvgIcon path={mdiMenu} type="mdi" size="1.5em" />
		</button>
		<a class="short-name" href="/" style="font-weight: bold;">{m.app_name_short()}</a>
		<a class="long-name" href="/" style="font-weight: bold;">{m.app_name()}</a>
	</div>
	<div
		style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap; justify-content: flex-end;"
	>
		{#if databases.length > 0}
			<div class="database-switcher-container">
				<SvgIcon type="mdi" path={mdiDatabase} size="24" />
				<select class="database-switcher" onchange={handleDatabaseChange} value={activeDatabaseId}>
					{#each databases as db}
						<option value={db.id}>{db.name}</option>
					{/each}
				</select>
			</div>
		{:else}
			<a href="/settings/database" class="database-switcher-container">
				<SvgIcon type="mdi" path={mdiAlert} size="24" />
				<span>{m.disconnected()}</span>
			</a>
		{/if}
		<div class="language-switcher-container">
			<SvgIcon type="mdi" path={mdiTranslate} size="24" />
			<select
				class="language-switcher"
				onchange={(e) => setLocale(e.target.value)}
				value={getLocale()}
			>
				<option value="es">Español</option>
				<option value="en">English</option>
				<option value="eu">Euskara</option>
			</select>
		</div>
	</div>
</nav>

<style>
	.language-switcher,
	.database-switcher {
		background: var(--accent);
		border: 1px solid #ccc;
		border-radius: 4px;
		color: white;
		padding: 5px;
		font-size: 16px;
		width: auto !important;
		margin: 0;
	}
	.language-switcher-container,
	.database-switcher-container {
		color: white;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 5px;
		flex-wrap: wrap;
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
