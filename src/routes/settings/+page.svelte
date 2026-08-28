<script>
	import LinkButton from '$lib/comp/buttons/LinkButton.svelte';
	import PersonSelector from '$lib/comp/PersonSelector.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		mdiLogin,
		mdiAccountGroup,
		mdiSchool,
		mdiAccountSupervisorCircle,
		mdiCoffee,
		mdiWallet,
		mdiWarehouse,
		mdiNote,
		mdiStar,
		mdiQrcodeScan,
		mdiCog,
		mdiDatabase
	} from '@mdi/js';
</script>

<h1>{m.settings()}</h1>

<div class="hero3 grid">
	<LinkButton href="/settings/database" icon={mdiDatabase} label={m.database()} />
	<LinkButton href="/settings/app" icon={mdiCog} label={m.app_settings()} />
</div>
<main class="colorguide">
	<h2>Guía de colores:</h2>
	<h3>Colores rellenados:</h3>
	<div class="gridcolors filledinputs">
		<div class="input" style="margin: 0;">
			Entrada de texto
		</div>
		<div class="input required empty" style="margin: 0;">
			Requerido
		</div>
		<div class="input required" style="margin: 0;">
			Requerido, rellenado
		</div>
		<div class="input disabled" style="margin: 0;">
			Deshabilitado
		</div>
	</div>
	<h3>Colores rayados:</h3>
	<div class="gridcolors stripedinputs">
		<div class="input" style="margin: 0;">
			Entrada de texto
		</div>
		<div class="input required empty" style="margin: 0;">
			Requerido
		</div>
		<div class="input required" style="margin: 0;">
			Requerido, rellenado
		</div>
		<div class="input disabled" style="margin: 0;">
			Deshabilitado
		</div>
	</div>
	<h3>Selector de personas:</h3>
	<div class="gridcolors">
		<PersonSelector
			label="Normal"
		/>
		<PersonSelector
			required
			label="Requerido"
		/>
	</div>
	<h3>Campos de texto:</h3>
	<div class="gridcolors">
		<input type="text" placeholder="Normal" />
		<input type="text" required placeholder="Requerido, sin rellenar" />
		<input type="text" required value="Requerido, rellenado" />
		<input type="text" disabled placeholder="Deshabilitado" />
	</div>
</main>

<style>
	.colorguide h3 {
		margin-top: 20px;
		margin-bottom: 10px;
	}
	.gridcolors {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 10px;
	}
	.gridcolors input {
		width: 100%;
		margin: 0;
	}
</style>