<script>
  import SvgIcon from "@jamescoyle/svelte-icon";
  import { mdiLink } from "@mdi/js";
  let { onclick, label, icon = mdiLink, background = "darkolivegreen", disabled = false, spin = false } = $props();
</script>

<button class="btn" type="submit" style={`background: ${background};`} disabled={disabled}>
  <SvgIcon type="mdi" path={icon} style={`animation: ${spin ? 'spin 1s linear infinite' : 'none'};`} />
  <span>{label}</span>
</button>