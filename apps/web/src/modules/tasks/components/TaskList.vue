<script setup lang="ts">
import { useTasksQuery, useUpdateTaskMutation, useDeleteTaskMutation } from '../task.queries'

const { data, error, isLoading } = useTasksQuery()
const { mutate: updateTask } = useUpdateTaskMutation()
const { mutate: deleteTask } = useDeleteTaskMutation()

function toggleDone(id: string, done: boolean) {
  updateTask({ id, done: !done })
}
</script>

<template>
  <div>
    <p v-if="isLoading" data-testid="tasks-loading" class="text-muted">Loading tasks…</p>

    <UAlert
      v-else-if="error"
      color="error"
      title="Couldn't load tasks"
      :description="error.message"
      data-testid="tasks-error"
    />

    <p v-else-if="data?.data.length === 0" data-testid="tasks-empty" class="text-muted">
      No tasks yet — add one above.
    </p>

    <ul v-else class="divide-y divide-default" data-testid="task-list">
      <li v-for="task in data?.data" :key="task.id" class="flex items-center gap-3 py-2">
        <UCheckbox :model-value="task.done" @update:model-value="toggleDone(task.id, task.done)" />
        <span class="flex-1" :class="{ 'line-through text-muted': task.done }">{{
          task.title
        }}</span>
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Delete task"
          @click="deleteTask(task.id)"
        />
      </li>
    </ul>
  </div>
</template>
