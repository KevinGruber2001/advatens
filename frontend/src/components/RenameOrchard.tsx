import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { schemas } from "../../generated.api"
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

function RenameOrchard({ orchardId, currentName }: { orchardId: string; currentName: string }) {
  type FormData = z.infer<typeof schemas.OrchardCreate>
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(schemas.OrchardCreate),
    defaultValues: {
      name: currentName,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiClient.updateOrchard(data, { params: { orchardId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchard", "list"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="mb-4">Rename Orchard</SheetTitle>
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

export default RenameOrchard
