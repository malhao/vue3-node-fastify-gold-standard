<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import { PostApiV1TasksBody } from '@gold-standard/api-client'
import type { z } from 'zod'
import { useCreateTaskMutation } from '../task.queries'

type CreateTaskInput = z.infer<typeof PostApiV1TasksBody>

const { mutateAsync, isLoading } = useCreateTaskMutation()
const form = useTemplateRef<Form<CreateTaskInput>>('form')

const state = reactive<Partial<CreateTaskInput>>({
  title: undefined,
  dueDate: undefined,
})

async function onSubmit(event: FormSubmitEvent<CreateTaskInput>) {
  try {
    await mutateAsync(event.data)
    state.title = undefined
    state.dueDate = undefined
    form.value?.clear()
  } catch {
    // The failure is surfaced by the mutation's onError toast; keep the user's input
    // so they can retry rather than losing what they typed.
  }
}
</script>

<template>
  <UForm
    ref="form"
    :schema="PostApiV1TasksBody"
    :state="state"
    class="flex items-start gap-2"
    @submit="onSubmit"
  >
    <UFormField name="title" class="flex-1">
      <UInput
        v-model="state.title"
        placeholder="What needs doing?"
        aria-label="Task title"
        data-testid="task-title-input"
      />
    </UFormField>
    <UButton type="submit" :loading="isLoading" data-testid="task-submit"> Add task </UButton>
  </UForm>
</template>
