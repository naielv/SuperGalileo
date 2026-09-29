<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getActiveDb, safeRandomString } from '$lib/db';
	import PersonSelector from '$lib/comp/PersonSelector.svelte';
	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import ActionButton from '$lib/comp/buttons/ActionButton.svelte';
	import CoffeeOptionPicker from '$lib/comp/coffee/CoffeeOptionPicker.svelte';
	import SvgIcon from '@jamescoyle/svelte-icon';
	import { mdiArrowLeft, mdiContentSave, mdiDelete } from '@mdi/js';
	import {
		COFFEE_PREFIX,
		DEFAULT_COFFEE_PRICES,
		ORDER_OPTIONS,
		ORDER_STATES,
		calculateOrderPrice,
		normalizePrices,
		parseOrder,
		personIdFromValue
	} from '$lib/coffee';
	import LinkButton from '../buttons/LinkButton.svelte';
	import { m } from '$lib/paraglide/messages';

	let { id = '', isNew = false } = $props();
	let dbInstance = $state(null);
	let feedback = $state({ type: 'info', message: '' });
	let selectedPerson = $state(null);
	let order = $state({});
	let orderDetails = $state({});
	let prices = $state(DEFAULT_COFFEE_PRICES);
	let debtCount = $state(0);
	let saldoMonedero = $state(0);
	let saving = $state(false);

	const defaultDetails = () => ({
		Selección: undefined,
		Tamaño: undefined,
		Temperatura: undefined,
		Leche: undefined,
		Cafeina: undefined,
		Endulzante: undefined,
		Receta: undefined
	});

	function setFeedback(message, type = 'info') {
		feedback = { type, message };
	}

	async function loadOrder() {
		if (!dbInstance) return;
		try {
			try {
				prices = normalizePrices(await dbInstance.get('config:precios_cafe'));
			} catch (error) {
				if (error.status !== 404) throw error;
			}
			if (isNew) {
				order = { Fecha: new Date().toISOString().slice(0, 10), Estado: 'Pedido', Notas: '' };
				orderDetails = defaultDetails();
				return;
			}
			const doc = await dbInstance.get(`${COFFEE_PREFIX}${id}`);
			order = { ...(doc.data || doc), _id: doc._id, _rev: doc._rev };
			orderDetails = { ...defaultDetails(), ...parseOrder(order.Comanda) };
			selectedPerson = {
				key: `personas:${personIdFromValue(order.Persona)}`,
				label: order.Persona
			};
		} catch (error) {
			setFeedback(`No se pudo cargar la comanda: ${error.message}`, 'error');
		}
	}

	async function countDebts(personId) {
		debtCount = 0;
		if (!dbInstance || !personId) return;
		try {
			const result = await dbInstance.allDocs({
				startkey: COFFEE_PREFIX,
				endkey: `${COFFEE_PREFIX}\uffff`,
				include_docs: true
			});
			debtCount = result.rows.filter((row) => {
				const data = row.doc?.data || row.doc || {};
				return (
					data.Estado === 'Deuda' && personIdFromValue(data.Persona) === personIdFromValue(personId)
				);
			}).length;
			try {
				const personDoc = await dbInstance.get(`personas:${personIdFromValue(personId)}`);
				console.log('personDoc:', personDoc);
				saldoMonedero = parseFloat(personDoc?.data?.Monedero_Balance || 0);
			} catch (error) {
				if (error.status !== 404) throw error;
				saldoMonedero = 0;
			}
		} catch (error) {
			setFeedback(`No se pudieron comprobar las deudas: ${error.message}`, 'error');
		}
	}

	$effect(() => {
		if (selectedPerson?.key) countDebts(selectedPerson.key);
	});

	async function saveOrder(event) {
		event.preventDefault();
		const personId = personIdFromValue(selectedPerson?.key);
		if (!personId) return setFeedback('Hay que elegir una persona.', 'error');
		if (isNew && debtCount >= 3)
			return setFeedback('Esta persona tiene tres o más comandas en deuda.', 'error');
		saving = true;
		const docId = isNew ? `${COFFEE_PREFIX}${Date.now()}_${safeRandomString()}` : order._id;
		const data = {
			Fecha: order.Fecha || new Date().toISOString().slice(0, 10),
			Persona: personId,
			Comanda: JSON.stringify(orderDetails),
			Notas: order.Notas || '',
			Estado: order.Estado || 'Pedido'
		};
		try {
			await dbInstance.put({ _id: docId, ...(isNew ? {} : { _rev: order._rev }), data });
			setFeedback('Comanda guardada correctamente.', 'success');
			setTimeout(() => goto('/coffee_shop'), 500);
		} catch (error) {
			setFeedback(`No se pudo guardar la comanda: ${error.message}`, 'error');
			saving = false;
		}
	}

	async function deleteOrder() {
		if (isNew || !confirm('¿Eliminar esta comanda?')) return;
		try {
			await dbInstance.remove({ _id: order._id, _rev: order._rev });
			goto('/coffee_shop');
		} catch (error) {
			setFeedback(`No se pudo eliminar la comanda: ${error.message}`, 'error');
		}
	}

	onMount(() => {
		try {
			dbInstance = getActiveDb();
			// if (dbInstance) loadOrder();
			// else setFeedback('No hay ninguna base de datos activa.', 'warning');
		} catch (error) {
			setFeedback(error.message, 'error');
		}
	});
	$effect(() => {
		if (dbInstance && id) {
			loadOrder();
			window.dispatchEvent(new CustomEvent('sidebar-closed'));
		}
	});
</script>


<div class="flex-header">
	<h1>{isNew ? m.new_coffee_order() : m.edit_wname({name: m.coffee_order()})}</h1>
	<div class="top-actions">
		<LinkButton href="/coffee_shop" icon={mdiArrowLeft} label={m.coffee_shop()} />
	</div>
</div>
{#if feedback.message}
	<p class="status-banner {feedback.type}">{feedback.message}</p>
{/if}
{#if dbInstance}
	<form onsubmit={saveOrder}>
		<div class="grid">
			{#if !isNew}
				<fieldset>
					<legend>Datos del pedido</legend>
					<label>
						<b>Fecha</b>
						<input type="date" bind:value={order.Fecha} required readonly />
					</label>
					<label>
						<b>Estado</b>
						<select bind:value={order.Estado}>
							{#each ORDER_STATES as state}
								<option value={state}>{state}</option>
							{/each}
						</select>
					</label>
				</fieldset>
			{/if}
			<fieldset>
				<legend>Detalle de la comanda</legend>
				<PersonSelector required bind:selected={selectedPerson} />
				<hr style="margin: 10px auto; max-width: 75%; border-top: 3px dashed #000;" />
				{#each Object.entries(ORDER_OPTIONS) as [key, { options, fieldIcon, icon }]}
					<label>
						<CoffeeOptionPicker
							label={key}
							{options}
							{fieldIcon}
							{icon}
							bind:selected={orderDetails[key]}
						/>
					</label>
				{/each}
				<p class="price">
					Total: <strong>
						{(calculateOrderPrice(orderDetails, prices) / 100).toFixed(2)} €
					</strong>
				</p>
				<details>
					<summary>Notas</summary>
					<textarea bind:value={order.Notas} rows="4" placeholder="Notas adicionales..."
					></textarea>
				</details>
				<hr style="margin: 10px auto; max-width: 75%; border-top: 3px dashed #000;" />
				<div
					style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 15px;"
				>
					<!-- If saldo < precio, show the amount of debt (delta) -->
					{#if saldoMonedero < calculateOrderPrice(orderDetails, prices) / 100}
						<div
							class="debt-warning"
							style="display: flex; flex-direction: column; align-items: center; border: 1px solid #ccc; padding: 5px; border-radius: 5px; gap: 5px"
						>
							<b>Saldo insuficiente</b>
							<small>
								Producirá deuda a no ser que se pague {(
									calculateOrderPrice(orderDetails, prices) / 100 -
									saldoMonedero
								).toFixed(2)} €
							</small>
						</div>
					{/if}
					{#if debtCount >= 3}
						<div
							class="debt-warning"
							style="display: flex; flex-direction: column; align-items: center; border: 1px solid #ccc; padding: 5px; border-radius: 5px; gap: 5px"
						>
							<b>Bloqueo de comanda por deuda</b>
							<small>{debtCount} comandas en deuda</small>
						</div>
					{/if}
				</div>
				<FormSubmitButton label={saving ? 'Guardando...' : 'Guardar'} icon={mdiContentSave} />
				{#if !isNew}
					<ActionButton
						label="Eliminar"
						icon={mdiDelete}
						background="#9f1a1a"
						onclick={deleteOrder}
					/>
				{/if}
			</fieldset>
		</div>
	</form>
{:else}
	<div class="no-db-warning">
		Configura una base de datos activa en <a href="/settings/database">Ajustes de Base de Datos</a
		>.
	</div>
{/if}

<style>
	.fieldset {
	    max-width: 200px;
	}
	.grid {
		display: flex;
		max-width: 400px;
		margin: 0 auto;
		gap: 15px;
		flex-direction: column;
	}
	label {
		display: block;
		margin-bottom: 7.5px;
	}
	label b {
		display: block;
		margin-bottom: 4px;
	}
	select,
	input,
	textarea {
		width: 100%;
	}
	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 20px;
		flex-wrap: wrap;
	}
	.price {
		font-size: 1.2rem;
		text-align: right;
		border-top: 1px solid #ddd;
		padding-top: 12px;
	}
	.status-banner,
	.no-db-warning {
		padding: 12px;
		border-radius: 5px;
		margin-bottom: 15px;
	}
	.status-banner.success {
		background: #d9f7dd;
		color: #124218;
	}
	.status-banner.warning,
	.no-db-warning {
		background: #fff4cc;
		color: #5b4200;
	}
	.debt-warning {
		background: #c72323;
		color: #fff;
	}
	.status-banner.error {
		background: #ffe1e1;
		color: #6f1111;
	}
</style>
