<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { mdiArrowLeft, mdiContentSave, mdiDelete } from '@mdi/js';
	import { getActiveDb } from '$lib/db';
	import { COMEDOR_PREFIX, COURSES, docId, normalizePicto, todayISO } from '$lib/comedor';
	import ArasaacPicker from '$lib/comp/ArasaacPicker.svelte';
	import Picto from '$lib/comp/Picto.svelte';
	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import ActionButton from '$lib/comp/buttons/ActionButton.svelte';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { toast } from 'svelte5-toaster';

	let id = $derived(page.params.id);
	const isNew = $derived(id === '_new');

	let db = $state(null);
	let fecha = $state('');
	let tipo = $state('');
	let saving = $state(false);

	// { Primero: {text}, ... } y { Primero: {text, arasaacId}, ... }
	let textos = $state({ Primero: '', Segundo: '', Postre: '' });
	let pictos = $state({ Primero: { text: '', arasaacId: '' }, Segundo: { text: '', arasaacId: '' }, Postre: { text: '', arasaacId: '' } });

	let pickerShow = $state(false);
	let pickerTarget = $state('Primero');

	function openPicker(course) {
		pickerTarget = course;
		pickerShow = true;
	}

	function onPictoPick({ text, arasaacId }) {
		pictos[pickerTarget] = { text, arasaacId };
		if (text) textos[pickerTarget] = text;
	}

	async function load() {
		if (!db) return;
		if (isNew) {
			fecha = todayISO();
			tipo = '';
			return;
		}
		try {
			const doc = await db.get(`${COMEDOR_PREFIX}${id}`);
			const data = doc.data || doc;
			fecha = data.Fecha || '';
			tipo = data.Tipo || '';
			for (const c of COURSES) {
				textos[c] = data[c] || '';
				pictos[c] = normalizePicto(data[`${c}_Picto`]);
			}
		} catch (error) {
			if (error.status !== 404) toast.error(`No se pudo cargar el menú: ${error.message}`);
		}
	}

	async function save(event) {
		event.preventDefault();
		if (!fecha) return toast.error('Indica la fecha.');
		if (!tipo.trim()) return toast.error('Indica el tipo de menú (p. ej. Almuerzo).');

		const data = {
			Fecha: fecha,
			Tipo: tipo.trim(),
			Primero: textos.Primero.trim(),
			Segundo: textos.Segundo.trim(),
			Postre: textos.Postre.trim(),
			Primero_Picto: pictos.Primero,
			Segundo_Picto: pictos.Segundo,
			Postre_Picto: pictos.Postre
		};
		const newId = docId(fecha, tipo.trim());

		saving = true;
		try {
			// Si cambió la clave (fecha y/o tipo), borrar la entrada anterior
			if (!isNew && newId !== `${COMEDOR_PREFIX}${id}`) {
				const oldDoc = await db.get(`${COMEDOR_PREFIX}${id}`);
				await db.remove({ _id: oldDoc._id, _rev: oldDoc._rev }).catch(() => {});
			}

			let existing = null;
			try {
				existing = await db.get(newId);
			} catch {}

			await db.put({
				_id: newId,
				...(existing ? { _rev: existing._rev } : {}),
				data
			});
			toast.success('Menú guardado.');
			goto('/comedor');
		} catch (error) {
			toast.error(`No se pudo guardar el menú: ${error.message}`);
		} finally {
			saving = false;
		}
	}

	async function borrar() {
		if (isNew || !confirm('¿Eliminar esta entrada del menú?')) return;
		try {
			const doc = await db.get(`${COMEDOR_PREFIX}${id}`);
			await db.remove({ _id: doc._id, _rev: doc._rev });
			toast.success('Menú borrado.');
			goto('/comedor');
		} catch (error) {
			toast.error(`No se pudo borrar: ${error.message}`);
		}
	}

	onMount(() => {
		try {
			db = getActiveDb();
			if (db) load();
		} catch (error) {
			toast.error(error.message);
		}
	});
</script>

{#if db}
	<div class="head">
		<LinkButton href="/comedor" label="Volver" icon={mdiArrowLeft} />
		<h1>{isNew ? 'Nuevo menú' : `Editar menú`}</h1>
	</div>

	<form class="formflex" onsubmit={save}>
		<fieldset>
			<legend>Datos</legend>
			<label>
				<b>Fecha</b>
				<input type="date" bind:value={fecha} required />
			</label>
			<label>
				<b>Tipo</b>
				<input type="text" bind:value={tipo} placeholder="Ej. Almuerzo" list="tipo-list" />
				<datalist id="tipo-list">
					<option value="Almuerzo" />
					<option value="Cena" />
				</datalist>
			</label>
		</fieldset>

		{#each COURSES as course}
			<fieldset>
				<legend>{course}</legend>
				<label>
					<b>Texto</b>
					<input type="text" bind:value={textos[course]} placeholder={`Ej. ${course}`} />
				</label>
				<div class="picto-row">
					<Picto value={pictos[course]} size={72} />
					<button type="button" class="btn-icon" onclick={() => openPicker(course)}>
						Pictograma
					</button>
					{#if pictos[course].arasaacId}
						<button
							type="button"
							class="btn-icon ghost"
							onclick={() => (pictos[course] = { text: '', arasaacId: '' })}
						>Quitar</button>
					{/if}
				</div>
			</fieldset>
		{/each}

		<div class="actions">
			<FormSubmitButton label={saving ? 'Guardando…' : 'Guardar'} icon={mdiContentSave} />
			{#if !isNew}
				<ActionButton label="Eliminar" icon={mdiDelete} background="#9f1a1a" onclick={borrar} />
			{/if}
		</div>
	</form>
{/if}

<ArasaacPicker bind:show={pickerShow} onPick={onPictoPick} title={`Pictograma para ${pickerTarget}`} />

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-bottom: 15px;
	}
	.head h1 {
		margin: 0;
	}
	.formflex {
		display: flex;
		flex-wrap: wrap;
		gap: 15px;
		align-items: flex-start;
	}
	fieldset {
		background: #fff;
		min-width: 260px;
	}
	label {
		display: block;
		margin-bottom: 10px;
	}
	label b {
		display: block;
		margin-bottom: 4px;
	}
	input {
		width: 100%;
		padding: 8px;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-sizing: border-box;
	}
	.picto-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 4px;
	}
	.btn-icon {
		padding: 8px 12px;
		border: none;
		border-radius: 4px;
		background: #667eea;
		color: #fff;
		font-weight: 700;
		cursor: pointer;
	}
	.btn-icon.ghost {
		background: #ff4757;
	}
	.actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: center;
	}
</style>