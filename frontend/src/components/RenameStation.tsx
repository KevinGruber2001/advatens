import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "../hooks/useApiClient"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet"

const renameStationSchema = z.object({ name: z.string().min(1) })

function RenameStation({ stationId, currentName }: { stationId: string; currentName: string }) {
  type FormData = z.infer<typeof renameStationSchema>
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(renameStationSchema),
    defaultValues: {
      name: currentName,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiClient.updateStation(data, { params: { stationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchard", "list"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({ name: data.name })
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="mb-4">Rename Station</SheetTitle>
        <SheetDescription asChild>
          <Form {...form}>
            <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Save</Button>
            </form>
          </Form>
        </SheetDescription>
      </SheetHeader>
    </>
  )
}

export default RenameStation
