<script>
	const PREFIX = 'personas';

	import { onMount } from 'svelte';
	import { page } from '$app/state';

	import {
		getActiveDb,
		getActiveDbConfig,
		decryptValue
	} from '$lib/db';

	import { m } from '$lib/paraglide/messages';

	import {
		calculateOrderPrice,
		DEFAULT_COFFEE_PRICES,
		orderSummary,
		parseOrder
	} from '$lib/coffee';

	let { children } = $props();

	let db = $state(null);
	let dbKey = $state('');
	let records = $state([]);
	let sidebar = $state(true);

	let changesFeed = null;

	const dbEvents = {
		'database-changed': loadActiveDatabase,
		'database-updated': loadActiveDatabase,
		'sidebar-toggle': () => (sidebar = !sidebar),
		'sidebar-open': () => (sidebar = true),
		'sidebar-closed': () => (sidebar = false)
	};

	async function loadActiveDatabase() {
		stopChanges();

		try {
			const config = getActiveDbConfig();
			const instance = getActiveDb();

			if (!config || !instance) {
				db = null;
				dbKey = '';
				records = [];
				people = new Map();
				return;
			}

			db = instance;
			dbKey = config.encryptionKey;

			await loadRecords();

			startChanges();
		} catch (error) {
			console.error('Error cargando la base de datos:', error);

			db = null;
			dbKey = '';
			records = [];
			people = new Map();

			alert(`Error al cargar la base de datos activa: ${error.message}`);
		}
	}

	async function loadRecords() {
		const result = await db.allDocs({
			startkey: `${PREFIX}:`,
			endkey: `${PREFIX}:\uffff`,
			include_docs: true,
			binary: true
		});

		records = await Promise.all(
			result.rows
				.map(({ doc }) => doc)
				.filter(Boolean)
				.map((doc) => decryptValue(doc, dbKey))
		);
	}
	function startChanges() {
		stopChanges();

		if (!db) return;

		changesFeed = db.changes({
			since: 'now',
			live: true,
			include_docs: true,
			binary: true
		});

		changesFeed.on('change', handleChange);

		changesFeed.on('error', (error) => {
			console.error('Changes error:', error);
		});
	}

	function stopChanges() {
		changesFeed?.cancel();
		changesFeed = null;
	}

	async function handleChange({ id, deleted, doc }) {
		if (!id.startsWith(`${PREFIX}:`)) return;

		if (deleted) {
			records = records.filter((record) => record._id !== id);
			return;
		}

		try {
			const record = await decryptValue(doc, dbKey);
			const index = records.findIndex((item) => item._id === id);

			if (index === -1) {
				records = [...records, record];
			} else {
				records[index] = record;
				records = [...records];
			}

			await loadPerson(record);
		} catch (error) {
			console.error(`Error procesando ${id}:`, error);
		}
	}

	onMount(() => {
		loadActiveDatabase();

		for (const [event, handler] of Object.entries(dbEvents)) {
			window.addEventListener(event, handler);
		}

		return () => {
			stopChanges();

			for (const [event, handler] of Object.entries(dbEvents)) {
				window.removeEventListener(event, handler);
			}
		};
	});
</script>



{#if db}
	<div class="duoshell" class:collapsed={!sidebar}>
		
		<div class="recordList">
			<h3 class="title">Personas</h3>
			{#each records.toSorted((a, b) => a.data.Region.localeCompare(b.data.Region) || a.data.Nombre.localeCompare(b.data.Nombre)) as record}
				{@const isActive = page.params.id == record._id.split(":")[1]}
				{@const balance = Number(record.data.Monedero_Balance)}
				{@const balanceColor = balance === 0 ? 'red' : ''}
				{@const balanceFormatted = balance.toLocaleString('es-ES', {
					style: 'currency',
					currency: 'EUR'
				})}
				<a class:active={isActive} href={'/people/' + record._id.split(':')[1]}>
					{#if record._attachments?.foto}
						{#await db.getAttachment(record._id, 'foto') then blob}
							<img
								src={URL.createObjectURL(blob)}
								alt={record.data.Nombre}
								loading="lazy"
								height="64"
							/>
						{/await}
					{/if}
					<div class="record-info" style="text-align: left;">
						<b>{record.data.Nombre}</b>
						<small><i>{record.data.Region}</i></small>
					</div>
					<b class="price" style:color={balanceColor}>{balanceFormatted}</b>
				</a>
			{/each}
		</div>
		<div class="content">
			{@render children()}
		</div>
	</div>
{:else}
	<div class="no-db-warning">
		<p>
			{m.db_not_connected_to_any()} <br />
			{m.db_configure_in_settings()}
		</p>

		<a href="/settings/database" class="button">
			Ir a Ajustes de Base de Datos
		</a>
	</div>
{/if}

<style>
	:global(section.content:has(.duoshell)) {
		padding: 0 !important;
	}

	.price {
		text-align: right;
		white-space: nowrap;
	}

	.no-db-warning {
		padding: 20px;
	}
</style>
