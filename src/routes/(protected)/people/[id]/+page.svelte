<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';

	import SvgIcon from '@jamescoyle/svelte-icon';
	import {
			mdiAccount,
			mdiArrowLeft,
			mdiBadgeAccount,
			mdiCoffee,
			mdiContentSave,
			mdiDelete,
			mdiEye,
			mdiEyeOff,
			mdiWallet
	} from '@mdi/js';
	import userGenericIcon from "$lib/assets/user_generic.png";
	import FormSubmitButton from '$lib/comp/buttons/FormSubmitButton.svelte';
	import ActionButton from '$lib/comp/buttons/ActionButton.svelte';
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import { toast } from 'svelte5-toaster';
	import { pb } from '$lib/pb';

	let id = $derived(page.params.id);
	let isNew = $derived(id === '_new');

	let nombre = $state('');
	let aula = $state('');
	let roles = $state('');
	let oculto = $state(false);
	let notas_cafe = $state('');
	let monederoBalance = $state(0);
	let existingRegions = $state([]);
	let rev = $state('');

	const predefinedRoles = {
		[m.system()]: {
			ADMIN: m.system_admin()
		},
		[m.people()]: {
			personas: m.people_access(),
			'personas:edit': m.people_edit()
		},
		[m.coffee_shop()]: {
			supercafe: m.supercafe_access(),
			'supercafe:edit': m.supercafe_edit()
		}
	};

	function resetForm() {
		nombre = '';
		aula = '';
		roles = '';
		oculto = false;
		notas_cafe = '';
		monederoBalance = 0;
		rev = '';
	}

	function toggleRole(role) {
		const current = roles;

		roles = current.includes(role)
			? current.filter((r) => r !== role)
			: [...current, role];
	}
	async function loadData(personId) {
		var user = {};
		if (!isNew) {
			user = await pb.collection("users").getOne(personId);
		}
		nombre = user.name || '';
		aula = user.aula || '';
		roles = user.roles || '';
		oculto = user.oculto || false;
		notas_cafe = user.notas_cafe || '';
		monederoBalance = Number(user.Saldo_Cafe || 0);
	}

	async function savePerson(e) {
		e.preventDefault();

		const personData = {
			name: nombre,
			aula: aula,
			roles: roles,
			oculto: oculto,
			notas_cafe: notas_cafe
		};

		try {
			if (isNew) {
				const newPerson = await pb.collection('users').create(personData);
				toast.success(m.save_success());
				goto(`/people/${newPerson.id}`);
			} else {
				await pb.collection('users').update(id, personData);
				toast.success(m.save_success());
				loadData(id);
			}
		} catch (error) {
			console.error(error);
			toast.error('Error guardando: ' + error.message);
		}
	}

	async function deletePerson() {
		if (confirm(m.confirm_delete_person())) {
			try {
				await pb.collection('users').delete(id);
				toast.success(m.person_deleted());
				goto('/people');
			} catch (error) {
				console.error(error);
				toast.error(m.error_deleting_person() + ': ' + error.message);
			}
		}
	}

	$effect(() => {
		if (id) {
			loadData(id);
			window.dispatchEvent(new CustomEvent('sidebar-closed'));
		}
	});
</script>

<form onsubmit={savePerson}>
	<div class="actions">
		<FormSubmitButton label={isNew ? m.new_person() : m.save()} icon={mdiContentSave} />
		{#if !isNew}
			<ActionButton
				label={m.delete()}
				icon={mdiDelete}
				background="#9f1a1a"
				onclick={deletePerson}
			/>
			<LinkButton
				href={`/people/${id}/payments`}
				label="Movimientos de pagos"
				icon={mdiWallet}
			/>
		{/if}
	</div>
	<div class="form-layout">
		<fieldset class="idCard">
			<div class="photo">
				<img src={userGenericIcon} alt="">
			</div>
			<div class="idFields">
				<label>
					<small>{m.full_name()}</small>
					<input style="font-size: 22.5px;" type="text" bind:value={nombre} placeholder="Ej. Juan Pérez" required />
				</label>
				<div class="half">
					<label>
						<small>{m.region_classroom()}</small>
						<select bind:value={aula}>
							<option value="">Sin Aula</option>
							{#each existingRegions as r}
								<option value={r}>{r}</option>
							{/each}
						</select>
					</label>
					<label>
						<small style="text-align: right;">Saldo Café</small>
						<b style="text-align: right; font-size: 22.5px;">{monederoBalance.toLocaleString("es-ES", {style: 'currency', currency: 'EUR'})}</b>
					</label>
				</div>
			</div>
		</fieldset>
		<fieldset>
			<h2>Datos del café</h2>

			<label>
				<b>{m.notes_section()}:</b>

				<textarea bind:value={notas_cafe} rows="6" placeholder={m.notes_section_placeholder()}
				></textarea>
			</label>

			<label class="inline-check input">
				<input type="checkbox" style="display: none;" bind:checked={oculto} />

				<SvgIcon path={oculto ? mdiEyeOff : mdiEye} type="mdi" size="1.6em" />

				<span>
					{oculto ? m.hide_from_inputs() : m.show_in_inputs()}
				</span>
			</label>
		</fieldset>

		<fieldset>
			<h2>{m.roles_and_permissions()}</h2>

			<div class="roles-permissions">
				{#each Object.entries(predefinedRoles) as [category, permissions]}
					<b>{category}</b>

					{#each Object.entries(permissions) as [key, label]}
						<label>
							{label}

							<input
								type="checkbox"
								checked={roles
									.includes(key)}
								onchange={() => toggleRole(key)}
							/>
						</label>
					{/each}
				{/each}
			</div>
		</fieldset>
	</div>
</form>


<style>
	form {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 2.5px;
		padding: 15px;
	}
	form h2 {
		text-align: center;
		margin: 0;
		margin-bottom: 7.5px;
	}
	.idCard {
		display: grid;
		grid-template-columns: 120px 1fr;
		padding: 0 5px;
		border-radius:5px;
		overflow: hidden;
	}
	.idCard .photo {
		border-right: 1px dashed gray;
	}
	.idCard .photo img {
		width: 100%;
	}
	.idCard .idFields {
		padding: 5px;
		display: flex;
		flex-direction: column;
		gap: 5px;
		justify-content: space-around;
	}
	.idCard label {
		margin: 0;
	}
	.idCard small,
	.idCard b {
		display: block;
	}
	.idCard input,
	.idCard select {
		border: none;
		border: 1px solid blue;
		background-color: transparent !important;
		font-size: 15px;
		padding: 2.5px 5px;
		margin: 0;
		
	}
	.idCard .half {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 5px;
	}
	.roles-permissions {
		display: flex;
		flex-direction: column;
		gap: 5px;
		overflow-y: auto;
	}

	.roles-permissions b {
		margin-top: 10px;
		font-size: 14px;
		text-align: center;
	}

	.roles-permissions label {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: 5px 7.5px;
		border-radius: 5px;
		gap: 5px;
		border: 1px solid #000;
		margin: 0;
	}

	.roles-permissions label input[type='checkbox'] {
		width: 20px;
		height: 20px;
		margin: 0;
	}

	.form-layout {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 5px;
		align-items: flex-start;
		margin-top: 5px;
	}

	@media (min-width: 768px) {
		.form-layout {
			grid-template-columns: 1.2fr 0.8fr;
		}
	}

	.main-form {
		width: 100%;
	}

	.help-text {
		display: block;
		color: #666;
		font-size: 12px;
		margin-top: 4px;
	}

	.inline-check {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 15px;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 20px;
		align-items: center;
		flex-wrap: wrap;
	}

	fieldset {
		width: 100%;
		max-width: 400px;
		background-color: white;
	}
	legend {
		background-color: white;
		padding: 0 5px;
	}
	.formflex {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 15px;
		background-color: wheat;
		height: 100%;
		padding: 15px;
	}
</style>
