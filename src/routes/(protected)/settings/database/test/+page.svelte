<script>
	import { onMount } from 'svelte';
	import { getLocalDb } from '$lib/db';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiDatabase, mdiPlus, mdiDelete, mdiPencil, mdiRefresh, mdiFilter } from '@mdi/js';
	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import { toast } from 'svelte5-toaster';

	let activeDbName = $state('');
	let activeDbId = $state('');
	let dbInstance = $state(null);
	let records = $state([]);
	let filteredRecords = $state([]);
	let selectedTableFilter = $state('all');
	let tables = $state([]);

	// Form state
	let tableInput = $state('tasks');
	let recordInput = $state('');
	let contentInput = $state('{\n  "title": "Nueva tarea",\n  "completed": false\n}');
	let editingRecordId = $state(null);

	function loadActiveDatabase() {
		try {
			const raw = localStorage.getItem('pouchdb_connections_v1');
			const databases = raw ? JSON.parse(raw) : [];
			const activeId = localStorage.getItem('active_database_id');

			let activeDb = null;
			if (activeId) {
				activeDb = databases.find((d) => d.id === activeId);
			}
			if (!activeDb && databases.length > 0) {
				activeDb = databases[0];
				localStorage.setItem('active_database_id', activeDb.id);
			}

			if (activeDb) {
				activeDbName = activeDb.localDatabase;
				activeDbId = activeDb.id;
				dbInstance = getLocalDb(activeDbName);
				toast.success(`Conectado a la base de datos local: ${activeDbName}`);
				loadRecords();
			} else {
				activeDbName = '';
				activeDbId = '';
				dbInstance = null;
				records = [];
				filteredRecords = [];
				tables = [];
				toast.warning(
					'No hay ninguna base de datos activa seleccionada. Configura una en Ajustes.'
				);
			}
		} catch (e) {
			toast.error('Error al cargar la base de datos activa: ' + e.message);
		}
	}

	async function loadRecords() {
		if (!dbInstance) return;
		try {
			const result = await dbInstance.allDocs({ include_docs: true });
			records = result.rows.map((row) => row.doc);

			// Extract unique tables from IDs of type "table:record"
			const extractedTables = new Set();
			records.forEach((doc) => {
				if (doc._id && doc._id.includes(':')) {
					const parts = doc._id.split(':');
					extractedTables.add(parts[0]);
				} else {
					extractedTables.add('sin_tabla');
				}
			});
			tables = Array.from(extractedTables);
			applyFilter();
		} catch (e) {
			toast.error('Error al cargar registros: ' + e.message);
		}
	}

	function applyFilter() {
		if (selectedTableFilter === 'all') {
			filteredRecords = records;
		} else if (selectedTableFilter === 'sin_tabla') {
			filteredRecords = records.filter((r) => !r._id || !r._id.includes(':'));
		} else {
			filteredRecords = records.filter((r) => r._id && r._id.startsWith(selectedTableFilter + ':'));
		}
	}

	$effect(() => {
		selectedTableFilter;
		records;
		applyFilter();
	});

	async function saveRecord(e) {
		e.preventDefault();
		if (!dbInstance) {
			toast.error('No hay base de datos activa.');
			return;
		}

		let parsedContent = {};
		try {
			parsedContent = JSON.parse(contentInput);
		} catch (err) {
			toast.error('El contenido debe ser un JSON válido.');
			return;
		}

		const table = tableInput.trim();
		const record = recordInput.trim();

		if (!table || !record) {
			toast.warning('La tabla y el registro son obligatorios.');
			return;
		}

		const targetId = `${table}:${record}`;

		try {
			if (editingRecordId) {
				// Editing existing record
				const existing = await dbInstance.get(editingRecordId);
				const updatedDoc = {
					...parsedContent,
					_id: editingRecordId,
					_rev: existing._rev
				};
				await dbInstance.put(updatedDoc);
				toast.success(`Registro ${editingRecordId} actualizado con éxito.`);
			} else {
				// Creating new record
				try {
					// Check if already exists
					await dbInstance.get(targetId);
					toast.error(
						`El registro con ID "${targetId}" ya existe. Elige otro nombre de registro o edítalo.`
					);
					return;
				} catch (err) {
					if (err.status !== 404) throw err;
				}

				const newDoc = {
					...parsedContent,
					_id: targetId
				};
				await dbInstance.put(newDoc);
				toast.success(`Registro "${targetId}" creado con éxito.`);
			}

			// Reset form and reload
			cancelEdit();
			await loadRecords();
		} catch (err) {
			toast.error('Error al guardar el registro: ' + err.message);
		}
	}

	function editRecord(doc) {
		editingRecordId = doc._id;
		if (doc._id.includes(':')) {
			const parts = doc._id.split(':');
			tableInput = parts[0];
			recordInput = parts.slice(1).join(':');
		} else {
			tableInput = 'sin_tabla';
			recordInput = doc._id;
		}

		// Copy doc without PouchDB metadata
		const cleanDoc = { ...doc };
		delete cleanDoc._id;
		delete cleanDoc._rev;
		contentInput = JSON.stringify(cleanDoc, null, 2);
	}

	function cancelEdit() {
		editingRecordId = null;
		recordInput = '';
		contentInput = '{\n  "title": "Nueva tarea",\n  "completed": false\n}';
	}

	async function deleteRecord(doc) {
		if (!confirm(`¿Eliminar el registro "${doc._id}"?`)) return;
		try {
			await dbInstance.remove(doc);
			toast.success(`Registro "${doc._id}" eliminado.`);
			await loadRecords();
		} catch (err) {
			toast.error('Error al eliminar registro: ' + err.message);
		}
	}

	onMount(() => {
		loadActiveDatabase();

		const handleDbChange = () => {
			loadActiveDatabase();
		};

		window.addEventListener('database-changed', handleDbChange);
		window.addEventListener('database-updated', handleDbChange);

		return () => {
			window.removeEventListener('database-changed', handleDbChange);
			window.removeEventListener('database-updated', handleDbChange);
		};
	});
</script>

<h1>Prueba de PouchDB</h1>
<h2 style="margin-bottom: 0;">Gestión de registros con IDs tipo "tabla:registro"</h2>

{#if dbInstance}
    <div class="filter-bar">
        <div class="filter-item">
            <SvgIcon path={mdiFilter} type="mdi" size="1.2em" />
            <b>Filtrar por tabla:</b>
            <select bind:value={selectedTableFilter}>
                <option value="all">Todas las tablas</option>
                {#each tables as table}
                    <option value={table}>{table}</option>
                {/each}
            </select>
        </div>
        <button class="button mini" onclick={loadRecords} title="Recargar">
            <SvgIcon path={mdiRefresh} type="mdi" size="1.2em" /> Recargar
        </button>
    </div>

    <h3>Registros en {activeDbName}</h3>
    {#if filteredRecords.length > 0}
        <table>
            <thead>
                <tr>
                    <th>ID (tabla:registro)</th>
                    <th>Tabla</th>
                    <th>Registro</th>
                    <th>Datos (JSON)</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {#each filteredRecords as doc}
                    {@const isSplit = doc._id.includes(':')}
                    {@const table = isSplit ? doc._id.split(':')[0] : 'sin_tabla'}
                    {@const record = isSplit ? doc._id.split(':').slice(1).join(':') : doc._id}
                    <tr>
                        <td><code>{doc._id}</code></td>
                        <td><span class="badge">{table}</span></td>
                        <td>{record}</td>
                        <td>
                            <pre class="json-preview">{JSON.stringify(
                                    doc["data"],
                                    (k, v) => (k.startsWith('_') ? undefined : v),
                                    2
                                )}</pre>
                        </td>
                        <td>
                            <div class="actions">
                                <button class="mini" onclick={() => editRecord(doc)}>
                                    <SvgIcon path={mdiPencil} type="mdi" size="1em" />
                                </button>
                                <button class="mini danger" onclick={() => deleteRecord(doc)}>
                                    <SvgIcon path={mdiDelete} type="mdi" size="1em" />
                                </button>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {:else}
        <p class="no-records">No hay registros que coincidan con el filtro en esta base de datos.</p>
    {/if}

    <hr />

    <h2>{editingRecordId ? 'Editar Registro' : 'Crear Nuevo Registro'}</h2>
    <form onsubmit={saveRecord}>
        <fieldset>
            <legend>
                <SvgIcon path={mdiDatabase} type="mdi" size="1.2em" /> Datos del documento
            </legend>

            <div class="id-builder">
                <label>
                    <b>Tabla (prefijo):</b>
                    <input
                        type="text"
                        bind:value={tableInput}
                        placeholder="tasks"
                        disabled={!!editingRecordId}
                        required
                    />
                </label>
                <span class="separator">:</span>
                <label>
                    <b>Registro (sufijo):</b>
                    <input
                        type="text"
                        bind:value={recordInput}
                        placeholder="tarea_1"
                        disabled={!!editingRecordId}
                        required
                    />
                </label>
            </div>

            <div class="id-preview">
                <b>ID resultante:</b>
                <code>{tableInput.trim() || 'tabla'}:{recordInput.trim() || 'registro'}</code>
            </div>

            <label style="margin-top: 15px;">
                <b>Contenido del documento (JSON):</b>
                <textarea
                    bind:value={contentInput}
                    rows="6"
                    placeholder="&#123;&#10;  &quot;title&quot;: &quot;Nueva tarea&quot;&#10;&#125;"
                    required></textarea>
            </label>
        </fieldset>

        <div class="form-actions">
            <FormSubmitButton
                label={editingRecordId ? 'Guardar cambios' : 'Crear registro'}
                icon={mdiPlus}
            />
            {#if editingRecordId}
                <button type="button" class="button" onclick={cancelEdit}>Cancelar edición</button>
            {/if}
        </div>
    </form>
{:else}
    <div class="no-db-warning">
        <p>
            Por favor, ve a la página de Ajustes de Base de Datos para registrar y activar una base de
            datos local PouchDB.
        </p>
        <a href="/settings/database" class="button">Ir a Ajustes de Base de Datos</a>
    </div>
{/if}

<style>
	.filter-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #f4f4f4;
		padding: 10px 15px;
		border-radius: 5px;
		margin-bottom: 15px;
		border: 1px solid #ddd;
	}

	.filter-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.filter-item select {
		width: auto;
		margin-top: 0;
		padding: 5px;
	}

	.badge {
		background: #e0e0e0;
		color: #333;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: bold;
	}

	.json-preview {
		background: #272822;
		color: #f8f8f2;
		padding: 8px;
		border-radius: 4px;
		font-family: monospace;
		font-size: 12px;
		max-height: 150px;
		overflow-y: auto;
		margin: 0;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.id-builder {
		display: flex;
		align-items: flex-end;
		gap: 10px;
	}

	.id-builder label {
		flex: 1;
		margin-bottom: 0;
	}

	.separator {
		font-size: 24px;
		font-weight: bold;
		padding-bottom: 5px;
	}

	.id-preview {
		margin-top: 10px;
		background: #eef;
		padding: 8px;
		border-radius: 4px;
		border-left: 4px solid #33f;
	}

	.no-records {
		text-align: center;
		padding: 20px;
		background: #fafafa;
		border: 1px dashed #ccc;
		border-radius: 5px;
		color: #666;
	}

	.no-db-warning {
		text-align: center;
		padding: 40px 20px;
		background: #fff4cc;
		border: 1px solid #ffeb3b;
		border-radius: 8px;
		color: #5b4200;
	}

	.no-db-warning p {
		margin-bottom: 20px;
		font-size: 18px;
	}

	.actions {
		display: flex;
		gap: 5px;
	}

	.mini {
		padding: 6px 10px;
		font-size: 13px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.mini.danger {
		background: #9f1a1a;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 15px;
		align-items: center;
	}

	textarea {
		font-family: monospace;
		font-size: 14px;
		background: #fdfdfd;
	}
</style>
