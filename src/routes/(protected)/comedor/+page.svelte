<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { mdiPlus, mdiSilverwareForkKnife } from '@mdi/js';
	import { getActiveDb, getActiveDbConfig, decryptValue } from '$lib/db';
	import { COMEDOR_PREFIX, todayISO, cleanupOldMenus } from '$lib/comedor';
	import Picto from '$lib/comp/Picto.svelte';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { toast } from 'svelte5-toaster';

	let db = $state(null);
	let dbKey = $state('');
	let menus = $state([]);
	let loading = $state(true);
	let changesFeed = null;

	const today = $derived(todayISO());

	function startChanges() {
		stopChanges();
		if (!db) return;
		changesFeed = db
			.changes({ since: 'now', live: true, retry: true, include_docs: true })
			.on('change', (change) => {
				if (change.id?.startsWith(COMEDOR_PREFIX)) loadMenus();
			})
			.on('error', (error) => console.error('Changes error:', error));
	}

	function stopChanges() {
		changesFeed?.cancel();
		changesFeed = null;
	}

	async function loadMenus() {
		if (!db) return;
		try {
			const config = getActiveDbConfig();
			if (!config) return;
			dbKey = config.encryptionKey;
			const result = await db.allDocs({
				startkey: COMEDOR_PREFIX,
				endkey: `${COMEDOR_PREFIX}\uffff`,
				include_docs: true
			});
			menus = result.rows
				.map((r) => decryptValue(r.doc, dbKey))
				.filter(Boolean)
				.sort((a, b) => String(a.data?.Fecha || '').localeCompare(String(b.data?.Fecha || '')));
		} catch (error) {
			console.error('Error cargando menús:', error);
			toast.error('Error al cargar los menús.');
		} finally {
			loading = false;
		}
	}

	function editHref(menu) {
		const id = (menu._id || '').replace(COMEDOR_PREFIX, '');
		return `/comedor/${encodeURIComponent(id)}`;
	}

	async function onDb() {
		stopChanges();
		db = getActiveDb();
		if (db) {
			await cleanupOldMenus(db).catch((e) => console.warn('cleanup error', e));
			await loadMenus();
			startChanges();
		} else {
			loading = false;
		}
	}

	onMount(() => {
		try {
			db = getActiveDb();
			if (db) onDb();
			else loading = false;
		} catch (error) {
			toast.error(error.message);
			loading = false;
		}
		window.addEventListener('database-changed', onDb);
		window.addEventListener('database-updated', onDb);
		return () => {
			stopChanges();
			window.removeEventListener('database-changed', onDb);
			window.removeEventListener('database-updated', onDb);
		};
	});
</script>

{#if db}
	<div class="head">
		<h1>🍽️ Menú del comedor</h1>
		<LinkButton href="/comedor/_new" label="Nuevo menú" icon={mdiPlus} background="green" />
	</div>

	{#if loading}
		<p class="empty">Cargando menús...</p>
	{:else if menus.length === 0}
		<p class="empty">No hay menús. Crea el primero con "Nuevo menú".</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Fecha</th>
						<th>Tipo</th>
						<th>Primero</th>
						<th>Segundo</th>
						<th>Postre</th>
					</tr>
				</thead>
				<tbody>
					{#each menus as menu}
						<tr class="row" class:today={menu.data?.Fecha === today} onclick={() => goto(editHref(menu))}>
							<td class="fecha">
								{menu.data?.Fecha}
								{#if menu.data?.Fecha === today}
									<span class="tl"> hoy</span>
								{/if}
							</td>
							<td>{menu.data?.Tipo}</td>
							<td><Picto value={menu.data?.Primero_Picto} /><span class="txt">{menu.data?.Primero}</span></td>
							<td><Picto value={menu.data?.Segundo_Picto} /><span class="txt">{menu.data?.Segundo}</span></td>
							<td><Picto value={menu.data?.Postre_Picto} /><span class="txt">{menu.data?.Postre}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{:else}
	<p class="empty">
		Configura una base de datos activa en
		<a href="/settings/database">Ajustes de Base de Datos</a>.
	</p>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 15px;
	}
	.head h1 {
		margin: 0;
	}
	.table-wrap {
		overflow-x: auto;
		background: #fff;
		border-radius: 10px;
		border: 1px solid #ddd;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 560px;
	}
	th,
	td {
		padding: 10px 12px;
		text-align: left;
		border-bottom: 1px solid #eee;
		vertical-align: middle;
	}
	th {
		background: #eef2f7;
		font-weight: 700;
		white-space: nowrap;
	}
	tr:last-child td {
		border-bottom: none;
	}
	tr.row {
		cursor: pointer;
	}
	tr.row:hover {
		background: #f1f4ff;
	}
	tr.today {
		background: #d9f7dd;
	}
	tr.today:hover {
		background: #c9efd0;
	}
	.fecha {
		white-space: nowrap;
		font-weight: 600;
	}
	.tl {
		color: #1a7f37;
		font-weight: 700;
	}
	.txt {
		margin-left: 8px;
	}
	.empty {
		padding: 14px;
		background: #fff3cd;
		border-radius: 8px;
		color: #5b4200;
	}
</style>