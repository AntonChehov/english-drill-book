<script setup lang="ts">
// About the app and «Оформление» (PROD-005; design D2 of `shell-offline-themes`): the theme is
// applied at once and kept; a choice the store refuses is said beside the group, and still holds
// until the page is closed.
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { getStore, noteStorageFailure } from "../storage";
import { applyTheme, theme, type Theme } from "../theme";

const choices: readonly { value: Theme; label: string }[] = [
  { value: "system", label: "Как в системе" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

const notKept = ref(false);

async function choose(chosen: Theme) {
  applyTheme(chosen);
  try {
    await (await getStore()).putSetting("theme", chosen);
    notKept.value = false;
  } catch (error) {
    noteStorageFailure(error);
    notKept.value = true;
  }
}
</script>

<template>
  <h1>О приложении</h1>
  <p>
    English Drill Book проверяет ответы на упражнения из книг по грамматике, запоминает ошибки и
    подсказывает, чем заняться сегодня. Работает в браузере, без регистрации; ваши данные остаются
    на этом устройстве.
  </p>

  <section class="theme card" aria-labelledby="theme-heading">
    <h2 id="theme-heading">Оформление</h2>
    <div class="choices" role="radiogroup" aria-labelledby="theme-heading">
      <label v-for="choice in choices" :key="choice.value" class="choice">
        <input
          type="radio"
          name="theme"
          :value="choice.value"
          :checked="theme === choice.value"
          @change="choose(choice.value)"
        />
        {{ choice.label }}
      </label>
    </div>
    <p v-if="notKept" class="failure" role="alert">
      Выбор не удалось сохранить: оформление изменено только до закрытия страницы.
    </p>
  </section>

  <p><RouterLink to="/">На главную</RouterLink></p>
</template>

<style scoped>
.theme {
  margin: 1.5rem 0;
  padding: 1rem;
}

h2 {
  font-size: 1.25rem;
  line-height: 1.3;
  margin: 0 0 0.5rem;
}

.choices {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.5rem;
}

.choice {
  align-items: center;
  display: inline-flex;
  gap: 0.5rem;
  min-height: 2.75rem;
}

.choice input {
  accent-color: var(--color-accent);
  height: 1.125rem;
  width: 1.125rem;
}

.failure {
  border-left: 4px solid var(--color-error);
  margin: 0.5rem 0 0;
  padding: 0.25rem 0 0.25rem 0.75rem;
}
</style>
