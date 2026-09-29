<script>
	const PREFIX = 'supercafe';

	import { onMount } from 'svelte';
	import { page } from '$app/state';

	import { getActiveDb, getActiveDbConfig, decryptValue } from '$lib/db';

	import { m } from '$lib/paraglide/messages';

	import {
		calculateOrderPrice,
		DEFAULT_COFFEE_PRICES,
		getOrderPrice,
		ORDER_STATES_MAP,
		orderSummary,
		parseOrder
	} from '$lib/coffee';

	let { children } = $props();

	let db = $state(null);
	let dbKey = $state('');
	let records = $state([]);
	let people = $state(new Map());
	let prices = $state(DEFAULT_COFFEE_PRICES);
	let sidebar = $state(true);
	let showIcons = $state(false);

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
			await Promise.all([loadPeople(), loadPrices()]);

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

	async function loadPeople() {
		const ids = [
			...new Set(
				records
					.map((record) => record.data?.Persona)
					.filter(Boolean)
					.map((id) => `personas:${id}`)
			)
		];

		if (!ids.length) {
			people = new Map();
			return;
		}

		const result = await db.allDocs({
			keys: ids,
			include_docs: true,
			attachments: true,
			binary: true
		});

		const map = new Map();

		for (const row of result.rows) {
			if (row.doc) {
				map.set(row.id, row.doc);
			}
		}

		people = map;
	}

	async function loadPrices() {
		try {
			const doc = await db.get('config:precios_cafe');

			prices = {
				...DEFAULT_COFFEE_PRICES,
				...doc
			};
		} catch (error) {
			if (error.status !== 404) {
				console.error('Error cargando precios:', error);
			}
		}
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

	async function loadPerson(record) {
		const personId = record.data?.Persona;

		if (!personId || !db) return;

		const id = `personas:${personId}`;

		if (people.has(id)) return;

		try {
			const person = await db.get(id, { attachments: true, binary: true });

			people = new Map(people).set(id, person);
		} catch (error) {
			if (error.status !== 404) {
				console.error(`Error cargando ${id}:`, error);
			}
		}
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

	function getPerson(record) {
		return people.get(`personas:${record.data?.Persona}`);
	}

	function getPersonId(record) {
		return record._id.split(':', 2)[1];
	}

	function getPhotoUrl(person) {
		const attachment = person?._attachments?.foto;

		if (!attachment?.data) return '';

		return URL.createObjectURL(attachment.data);
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
			<div class="title">
				<input type="checkbox" title="Mostrar comanda" bind:checked={showIcons} />
				<h3>Comandas</h3>
				<a href="/coffee_shop/_new">Nuevo</a>
			</div>

			{#each records.toSorted((a, b) => b.data.Fecha.localeCompare(a.data.Fecha) || getPerson(a)?.Region?.localeCompare(getPerson(b)?.Region) || getPerson(a)?.Nombre?.localeCompare(getPerson(b)?.Nombre)) as record}
				{@const person = getPerson(record)}
				{@const personId = getPersonId(record)}
				{@const price = getOrderPrice(prices, record)}
				{@const isActive = page.params.id === personId}
				{@const canPay = person?.data?.Monedero_Balance >= price}

				<a
					class="record"
					class:active={isActive}
					href={`/coffee_shop/${personId}`}
					style="flex-direction: column; align-items: stretch; gap: 2.5px"
				>
					<div class="rowflex">
						{#if person}
							<div style="display: flex; flex-direction: column; gap: 2.5px; text-align: center">
								{#if person._attachments?.foto}
									<img
										src={getPhotoUrl(person)}
										alt={person.data?.Nombre ?? ''}
										loading="lazy"
										height="64"
									/>
								{/if}

								<b>{person.data?.Nombre}</b>
								<small><i>{person.data?.Region}</i></small>
							</div>
						{/if}

						<div class="record-info">
							<span>{orderSummary(record.data)}</span>
							<small>
								<i>{record.data?.Fecha}</i>
							</small>
						</div>

						<b class="price" style:color={canPay ? 'green' : 'red'}>
							{price} €
						</b>
					</div>
					<b
						style:background={ORDER_STATES_MAP[record.data.Estado]}
						style="text-align: center; border-radius: 5px; padding: 6px 3px; color: white; font-size: 17px;"
						>{record.data.Estado}</b
					>
					<!-- {record.data.Comanda} -->
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

		<a href="/settings/database" class="button"> Ir a Ajustes de Base de Datos </a>
	</div>
{/if}

<style>
	:global(section.content:has(.duoshell)) {
		padding: 0 !important;
	}
	div.content {
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
