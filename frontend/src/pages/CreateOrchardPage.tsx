import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { schemas } from "../../generated.api"
import {
  Alert,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "../hooks/useApiClient"

function CreateOrchardPage() {
  type FormData = z.infer<typeof schemas.OrchardCreate>
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schemas.OrchardCreate),
    defaultValues: {
      name: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (newOrchard: FormData) => {
      return apiClient.createOrchard(newOrchard)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchard", "list"] })
      reset()
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h4" gutterBottom>
        Create Orchard
      </Typography>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(mutation.error as Error)?.message || "Failed to create orchard"}
        </Alert>
      )}

      <TextField
        label="Name"
        fullWidth
        margin="normal"
        {...register("name")}
        error={!!errors.name}
        helperText={errors.name?.message}
        disabled={mutation.isPending}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={mutation.isPending}
        startIcon={mutation.isPending ? <CircularProgress size={20} /> : null}
      >
        {mutation.isPending ? "Submitting..." : "Submit"}
      </Button>
    </form>
  )
}

export default CreateOrchardPage
