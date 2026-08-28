<script>
	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import {
		mdiArrowCollapse,
		mdiDatabase,
		mdiDelete,
		mdiHelpNetwork,
		mdiPencil,
		mdiSync,
		mdiTestTube
	} from '@mdi/js';
	import { onMount } from 'svelte';
	import { compactLocalDb, syncOnce, testLocalDb, testRemoteDb } from '$lib/db';
	import { m } from '$lib/paraglide/messages';

	const STORAGE_KEY = 'pouchdb_connections_v1';

	let databases = $state([]);
	let feedback = $state({ type: 'info', message: '' });
	let online = $state(true);
	let busyById = $state({});
	let editingId = $state(null);
	let form = $state(defaultForm());

	function defaultForm() {
		return {
			name: '',
			localDatabase: 'sg_local',
			serverUrl: '',
			remoteDatabase: '',
			username: '',
			password: '',
			encryptionKey: '',
			syncEnabled: false
		};
	}

	function createId() {
		return `db_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	}

	function normalizeURL(url) {
		// Normalize string:
		// https://couch.example.com/ => https://couch.example.com
		// couch.example.com => https://couch.example.com
		// Remove trailing slashes and ensure it starts with http:// or https://
		// http://couch.example.com/example => https://couch.example.com
		// couch.example.com/example => https://couch.example.com
		// If the URL is empty or invalid, return an empty string.
		if (!url) return '';
		try {
			let normalized = url.trim();
			if (!/^https?:\/\//i.test(normalized)) {
				normalized = 'https://' + normalized;
			}
			return normalized;
		} catch {
			return url.trim();
		}
	}

	function normalizeConfig(config) {
		return {
			id: config.id ?? createId(),
			name: (config.name ?? '').trim(),
			localDatabase: (config.localDatabase ?? '').trim(),
			serverUrl: normalizeURL(config.serverUrl ?? ''),
			remoteDatabase: (config.remoteDatabase ?? '').trim(),
			username: (config.username ?? '').trim(),
			password: config.password ?? '',
			encryptionKey: config.encryptionKey ?? '',
			syncEnabled: Boolean(config.syncEnabled),
			liveSyncRunning: Boolean(config.liveSyncRunning),
			lastStatus: config.lastStatus ?? 'Sin actividad',
			lastSyncAt: config.lastSyncAt ?? null,
			lastError: config.lastError ?? ''
		};
	}

	function saveDatabases() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(databases));
		window.dispatchEvent(new CustomEvent('database-updated'));
	}

	function setFeedback(message, type = 'info') {
		feedback = { type, message };
	}

	function updateDatabase(id, updater) {
		databases = databases.map((item) => {
			if (item.id !== id) {
				return item;
			}
			return updater(item);
		});
		saveDatabases();
	}

	function setBusy(id, value) {
		busyById = {
			...busyById,
			[id]: value
		};
	}

	function hydrateFromStorage() {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			databases = [];
			return;
		}

		try {
			const parsed = JSON.parse(raw);
			databases = Array.isArray(parsed) ? parsed.map(normalizeConfig) : [];
		} catch {
			databases = [];
			setFeedback('No se pudo leer configuracion guardada. Se inicio una lista nueva.', 'warning');
		}
	}

	function resetForm() {
		editingId = null;
		form = defaultForm();
	}

	function editDatabase(config) {
		editingId = config.id;
		form = {
			name: config.name,
			localDatabase: config.localDatabase,
			serverUrl: config.serverUrl,
			remoteDatabase: config.remoteDatabase,
			username: config.username,
			password: config.password,
			encryptionKey: config.encryptionKey || '',
			syncEnabled: config.syncEnabled
		};
	}

	function removeDatabase(config) {
		if (!confirm(`Eliminar configuracion ${config.name}?`)) {
			return;
		}
		databases = databases.filter((item) => item.id !== config.id);

		// If the deleted database was the active one, update the active database ID
		const activeId = localStorage.getItem('active_database_id');
		if (activeId === config.id) {
			if (databases.length > 0) {
				localStorage.setItem('active_database_id', databases[0].id);
			} else {
				localStorage.removeItem('active_database_id');
			}
		}

		saveDatabases();
		setFeedback('Configuracion eliminada.', 'success');
		if (editingId === config.id) {
			resetForm();
		}
	}

	function toggleSyncEnabled(config) {
		const newValue = !config.syncEnabled;
		updateDatabase(config.id, (item) => ({
			...item,
			syncEnabled: newValue,
			lastStatus: newValue ? 'Sync habilitado' : 'Sync deshabilitado'
		}));
	}

	async function runTestLocal(config) {
		setBusy(config.id, true);
		try {
			const info = await testLocalDb(config.localDatabase);
			updateDatabase(config.id, (item) => ({
				...item,
				lastStatus: `Local OK (${info.docCount} docs)`,
				lastError: ''
			}));
			setFeedback(`Base local ${config.localDatabase} disponible.`, 'success');
		} catch (error) {
			updateDatabase(config.id, (item) => ({
				...item,
				lastStatus: 'Error en base local',
				lastError: error instanceof Error ? error.message : 'Error desconocido'
			}));
			setFeedback('No se pudo validar la base local.', 'error');
		} finally {
			setBusy(config.id, false);
		}
	}

	async function runTestRemote(config) {
		setBusy(config.id, true);
		try {
			const info = await testRemoteDb(config);
			updateDatabase(config.id, (item) => ({
				...item,
				lastStatus: `Servidor OK (${info.docCount} docs)`,
				lastError: ''
			}));
			setFeedback('Conexion remota validada.', 'success');
		} catch (error) {
			updateDatabase(config.id, (item) => ({
				...item,
				lastStatus: 'Error de conexion remota',
				lastError: error instanceof Error ? error.message : 'Error desconocido'
			}));
			setFeedback('No se pudo validar el servidor remoto.', 'error');
		} finally {
			setBusy(config.id, false);
		}
	}

	async function runCompactLocal(config) {
		setBusy(config.id, true);
		try {
			await compactLocalDb(config.localDatabase);
			updateDatabase(config.id, (item) => ({
				...item,
				lastStatus: 'Compactacion local completada',
				lastError: ''
			}));
			setFeedback(`Compactacion de ${config.localDatabase} completada.`, 'success');
		} catch (error) {
			updateDatabase(config.id, (item) => ({
				...item,
				lastStatus: 'Error en compactacion local',
				lastError: error instanceof Error ? error.message : 'Error desconocido'
			}));
			setFeedback('No se pudo compactar la base local.', 'error');
		} finally {
			setBusy(config.id, false);
		}
	}

	async function runSyncOnce(config) {
		setBusy(config.id, true);
		try {
			await syncOnce(config);
			updateDatabase(config.id, (item) => ({
				...item,
				lastStatus: 'Sync manual completado',
				lastSyncAt: new Date().toISOString(),
				lastError: ''
			}));
			setFeedback('Sincronizacion manual completada.', 'success');
		} catch (error) {
			updateDatabase(config.id, (item) => ({
				...item,
				lastStatus: 'Fallo en sync manual',
				lastError: error instanceof Error ? error.message : 'Error desconocido'
			}));
			setFeedback('No se pudo completar la sincronizacion manual.', 'error');
			throw error; // Rethrow to allow further handling if needed
		} finally {
			setBusy(config.id, false);
		}
	}

	function submitForm(event) {
		event.preventDefault();

		const normalized = normalizeConfig({
			id: editingId ?? undefined,
			name: form.name || form.localDatabase,
			localDatabase: form.localDatabase,
			serverUrl: form.serverUrl,
			remoteDatabase: form.remoteDatabase,
			username: form.username,
			password: form.password,
			encryptionKey: form.encryptionKey,
			syncEnabled: form.syncEnabled
		});

		if (!normalized.name || !normalized.localDatabase) {
			setFeedback('Nombre y base local son obligatorios.', 'warning');
			return;
		}

		if (normalized.syncEnabled && (!normalized.serverUrl || !normalized.remoteDatabase)) {
			setFeedback('Para sincronizar, completa servidor y base remota.', 'warning');
			return;
		}

		if (editingId) {
			databases = databases.map((item) =>
				item.id === editingId ? { ...item, ...normalized } : item
			);
			setFeedback('Configuracion actualizada.', 'success');
		} else {
			databases = [
				...databases,
				{
					...normalized,
					lastStatus: 'Configuracion creada',
					liveSyncRunning: false,
					lastSyncAt: null,
					lastError: ''
				}
			];
			setFeedback('Base registrada.', 'success');
		}

		saveDatabases();
		resetForm();
	}

	onMount(() => {
		online = navigator.onLine;
		const handleOnline = () => {
			online = true;
			setFeedback('Conexion restaurada.', 'info');
		};
		const handleOffline = () => {
			online = false;
			setFeedback('Sin conexion. El modo offline-first sigue disponible.', 'warning');
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		hydrateFromStorage();

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

<div class="flex-header">
	<h1>Ajustes: Base de datos</h1>
	<div class="top-actions">
		<LinkButton
			href="/settings/database/test"
			icon={mdiDatabase}
			label="Ver registros"
		/>
	</div>
</div>
<main>
	<p class="status-banner {online ? 'ok' : 'warning'}">
		{online ? 'Conectado a internet' : 'Sin internet: datos locales disponibles'}
	</p>
	{#if feedback.message}
		<p class="status-banner {feedback.type}">{feedback.message}</p>
	{/if}
</main>

<h3>Bases registradas</h3>
{#if databases.length > 0}
	<table>
		<thead>
			<tr>
				<th>Nombre</th>
				<th>Remota</th>
				<th>Sync</th>
				<th class="hs">Estado</th>
				<th>Acciones</th>
			</tr>
		</thead>
		<tbody>
			{#each databases as db}
				<tr>
					<td class="dl-field" style="width: 200px;">
						{db.name}
						<small>{db.localDatabase}</small>
					</td>
					<td class="dl-field" style="width: 200px;">
						{db.remoteDatabase ? `${db.remoteDatabase}` : '-'}
						<small>{db.serverUrl ? `${db.serverUrl}` : '-'}</small>
					</td>
					<td class="dl-field" style="width: 45px; padding: 0;">
						<input
							type="checkbox"
							style="width: 40px; margin: 0; vertical-align: middle;"
							checked={db.syncEnabled}
							onchange={() => toggleSyncEnabled(db)}
						/>
					</td>
					<td class="dl-field hs" style="width: auto;">
						<b>{db.lastStatus}</b>
						{#if db.lastSyncAt}
							<small>Ultimo sync: {new Date(db.lastSyncAt).toLocaleString()}</small>
						{/if}
						{#if db.lastError}
							<small class="error-text">{db.lastError}</small>
						{/if}
					</td>
					<td style="width: 100px; padding: 0;">
						<div class="actions">
							<button
								class="button hs mini-btn accent"
								onclick={() => runTestLocal(db)}
								disabled={busyById[db.id]}
							>
								<SvgIcon path={mdiTestTube} type="mdi" size="1.75em" />
							</button>
							<button
								class="button hs mini-btn accent"
								onclick={() => runTestRemote(db)}
								disabled={busyById[db.id]}
							>
								<SvgIcon path={mdiHelpNetwork} type="mdi" size="1.75em" />
							</button>
							<button
								class="button mini-btn accent"
								onclick={() => runCompactLocal(db)}
								disabled={busyById[db.id]}
							>
								<SvgIcon path={mdiArrowCollapse} type="mdi" size="1.75em" />
							</button>
							<button
								class="button mini-btn accent"
								onclick={() => runSyncOnce(db)}
								disabled={busyById[db.id] || !db.syncEnabled}
							>
								<SvgIcon path={mdiSync} type="mdi" size="1.75em" />
							</button>
							<button
								class="button mini-btn"
								onclick={() => editDatabase(db)}
								title={m.edit()}
								aria-label={m.edit()}
							>
								<SvgIcon path={mdiPencil} type="mdi" size="1.75em" />
							</button>
							<button
								class="button mini-btn danger"
								onclick={() => removeDatabase(db)}
								title={m.delete()}
								aria-label={m.delete()}
							>
								<SvgIcon path={mdiDelete} type="mdi" size="1.75em" />
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>No hay bases de datos conectadas.</p>
{/if}
<hr />
<h2>{editingId ? m.edit_wname({ name: m.database }) : m.add_wname({ name: m.database() })}</h2>
<main>
	<form onsubmit={submitForm}>
		<fieldset>
			<legend>
				<SvgIcon path={mdiDatabase} type="mdi" size="1.2em" /> Configuracion de base de datos
			</legend>
			<label>
				<b>Nombre visible:</b>
				<input type="text" bind:value={form.name} placeholder="Mi base de trabajo" required />
			</label>
			<label>
				<b>Base local PouchDB:</b>
				<input
					type="text"
					bind:value={form.localDatabase}
					placeholder="supergalileo_local"
					required
				/>
			</label>
			<label>
				<b>Servidor remoto (opcional):</b>
				<input type="text" bind:value={form.serverUrl} placeholder="https://couch.example.com" />
			</label>
			<label>
				<b>Base remota:</b>
				<input type="text" bind:value={form.remoteDatabase} placeholder="supergalileo" />
			</label>
			<label>
				<b>Usuario remoto:</b>
				<input type="text" bind:value={form.username} placeholder="admin" />
			</label>
			<label>
				<b>Contraseña remota:</b>
				<input type="password" bind:value={form.password} placeholder="********" />
			</label>
			<label>
				<b>Clave de encriptación:</b>
				<input type="text" bind:value={form.encryptionKey} placeholder="********" />
			</label>
			<label class="inline-check">
				<input type="checkbox" bind:checked={form.syncEnabled} />
				<span>Habilitar sincronizacion offline-first</span>
			</label>
		</fieldset>
		<div class="form-actions">
			<FormSubmitButton label={editingId ? 'Guardar cambios' : 'Añadir base de datos'} />
			{#if editingId}
				<button type="button" class="button" onclick={resetForm}>Cancelar edicion</button>
			{/if}
		</div>
	</form>
</main>

<style>
	h3 {
		margin-top: 15px;
		margin-bottom: 10px;
	}

	.status-banner {
		padding: 10px;
		border-radius: 5px;
		margin-bottom: 12px;
		font-weight: bold;
	}

	.status-banner.ok,
	.status-banner.success {
		background: #d9f7dd;
		color: #124218;
	}

	.status-banner.warning {
		background: #fff4cc;
		color: #5b4200;
	}

	.status-banner.error {
		background: #ffe1e1;
		color: #6f1111;
	}

	.inline-check {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
	}

	.inline-check input {
		width: auto;
		height: 20px;
		width: 20px;
		margin: 0;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1px;
		width: 100%;
		justify-content: center;
	}

	.mini {
		padding: 6px 8px;
		font-size: 13px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.error-text {
		display: block;
		color: #9f1a1a;
		font-size: 12px;
		margin-top: 4px;
	}

	small {
		display: block;
		margin-top: 4px;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 12px;
		align-items: center;
		flex-wrap: wrap;
	}

	@media (max-width: 700px) {
		.hs {
			display: none;
		}
	}

</style>
