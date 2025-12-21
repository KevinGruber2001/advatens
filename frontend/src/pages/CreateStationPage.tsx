import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { schemas } from "../../generated.api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "../hooks/useApiClient"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useParams } from "react-router"

function CreateStationPage() {
  type FormData = z.infer<typeof schemas.StationCreate>
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const { orchardId } = useParams();


  const form = useForm<FormData>({
    resolver: zodResolver(schemas.StationCreate),
    defaultValues: {
      name: "",
      device_id: "",
      orchard_id: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (newStation: FormData) => {
      return apiClient.createStation(newStation)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchard", "list"] })
      form.reset()
    },
  })

  if (!orchardId) {
    return <div>Orchard ID is missing in the URL.</div>
  }

  const onSubmit = (data: FormData) => {
    mutation.mutate({...data, orchard_id: orchardId})
  }

  return (
    <Form {...form}>
      <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                This your personal name for the Device
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="device_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device ID</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                This is the ID Number on you station.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>

    // <form onSubmit={handleSubmit(onSubmit)}>
    //   <Typography variant="h4" gutterBottom>
    //     Create Station
    //   </Typography>

    //   {mutation.isError && (
    //     <Alert severity="error" sx={{ mb: 2 }}>
    //       {(mutation.error as Error)?.message || "Failed to create station"}
    //     </Alert>
    //   )}

    //   <TextField
    //     label="Name"
    //     fullWidth
    //     margin="normal"
    //     {...register("name")}
    //     error={!!errors.name}
    //     helperText={errors.name?.message}
    //     disabled={mutation.isPending}
    //   />

    //   <TextField
    //     label="Device ID"
    //     fullWidth
    //     margin="normal"
    //     {...register("device_id")}
    //     error={!!errors.device_id}
    //     helperText={errors.device_id?.message}
    //     disabled={mutation.isPending}
    //   />

    //   <Button
    //     type="submit"
    //     variant="contained"
    //     color="primary"
    //     disabled={mutation.isPending}
    //     startIcon={mutation.isPending ? <CircularProgress size={20} /> : null}
    //   >
    //     {mutation.isPending ? "Submitting..." : "Submit"}
    //   </Button>
    // </form>
  )
}

export default CreateStationPage
